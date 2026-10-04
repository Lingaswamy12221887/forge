insert into permissions(key) values ('documents.view'),('documents.manage') on conflict do nothing;
insert into role_permissions select r.id,p.key from roles r, permissions p where r.name='Organization Owner' and p.key in ('documents.view','documents.manage') on conflict do nothing;

-- Quizzes: correct answers live in a separate table students cannot read; grading is server-side.
create table quizzes(id uuid primary key default gen_random_uuid(), course_id uuid not null unique references courses on delete cascade, title text not null default 'Course quiz');
create table quiz_questions(id uuid primary key default gen_random_uuid(), quiz_id uuid not null references quizzes on delete cascade, prompt text not null check(char_length(prompt) between 3 and 500), options jsonb not null);
create table quiz_answers(question_id uuid primary key references quiz_questions on delete cascade, correct_index int not null check(correct_index>=0));
create table quiz_attempts(id uuid primary key default gen_random_uuid(), quiz_id uuid not null references quizzes on delete cascade, user_id uuid not null default auth.uid(), score int not null, total int not null, created_at timestamptz default now());
alter table quizzes enable row level security; alter table quiz_questions enable row level security; alter table quiz_answers enable row level security; alter table quiz_attempts enable row level security;
create policy qz_read on quizzes for select using (exists(select 1 from courses c where c.id=course_id));
create policy qq_read on quiz_questions for select using (exists(select 1 from quizzes z where z.id=quiz_id));
create policy qa_read on quiz_answers for select using (has_perm('training.manage') and exists(select 1 from quiz_questions q where q.id=question_id));
create policy att_read on quiz_attempts for select using (user_id=auth.uid() or (has_perm('training.manage') and exists(select 1 from quizzes z where z.id=quiz_id)));
create function add_quiz_question(p_course uuid, p_prompt text, p_options jsonb, p_correct int) returns void language plpgsql security definer set search_path=public as $$
declare z uuid; q uuid;
begin if not has_perm('training.manage') or not exists(select 1 from courses where id=p_course and organization_id=auth_org()) then raise exception 'forbidden'; end if;
 if jsonb_typeof(p_options)<>'array' or jsonb_array_length(p_options) not between 2 and 6 or p_correct<0 or p_correct>=jsonb_array_length(p_options) then raise exception 'invalid question'; end if;
 insert into quizzes(course_id) values(p_course) on conflict(course_id) do nothing; select id into z from quizzes where course_id=p_course;
 insert into quiz_questions(quiz_id,prompt,options) values(z,p_prompt,p_options) returning id into q; insert into quiz_answers values(q,p_correct); end $$;
create function submit_quiz(p_quiz uuid, p_answers jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare cid uuid; total int; score int;
begin select z.course_id into cid from quizzes z join courses c on c.id=z.course_id where z.id=p_quiz and c.organization_id=auth_org();
 if cid is null or not exists(select 1 from enrollments where course_id=cid and user_id=auth.uid()) then raise exception 'not enrolled'; end if;
 select count(*), count(*) filter (where p_answers->>(q.id::text) = a.correct_index::text) into total, score from quiz_questions q join quiz_answers a on a.question_id=q.id where q.quiz_id=p_quiz;
 insert into quiz_attempts(quiz_id,score,total) values(p_quiz,score,total); return jsonb_build_object('score',score,'total',total); end $$;

-- Refunds: prepared in SQL (permission + state checks), executed by the refund-create Edge Function.
alter table payments add column provider_payment_id text;
create table refunds(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, payment_id uuid not null references payments, order_id uuid not null references orders, amount numeric(12,2) not null, reason text, status text not null default 'pending' check(status in ('pending','processed','failed')), created_by uuid default auth.uid(), created_at timestamptz default now());
alter table refunds enable row level security;
create policy ref_read on refunds for select using (organization_id=auth_org() and has_perm('finance.view'));
create function prepare_refund(p_order uuid, p_reason text) returns jsonb language plpgsql security definer set search_path=public as $$
declare pay payments%rowtype; rid uuid;
begin if not has_perm('finance.manage') then raise exception 'forbidden'; end if;
 select * into pay from payments where order_id=p_order and organization_id=auth_org() and status='paid' limit 1; if not found then raise exception 'nothing to refund'; end if;
 if exists(select 1 from refunds where payment_id=pay.id and status in ('pending','processed')) then raise exception 'already refunded'; end if;
 insert into refunds(organization_id,payment_id,order_id,amount,reason) values(pay.organization_id,pay.id,pay.order_id,pay.amount,left(p_reason,200)) returning id into rid;
 return jsonb_build_object('refund_id',rid,'payment_id',pay.id,'order_id',pay.order_id,'provider',pay.provider,'provider_ref',pay.provider_ref,'provider_payment_id',pay.provider_payment_id,'amount',pay.amount,'organization_id',pay.organization_id); end $$;

create table documents(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, name text not null, category text not null default 'general', storage_path text not null unique, mime text not null, size_bytes int not null check(size_bytes>0 and size_bytes<=10485760), version int not null default 1, expires_on date, uploaded_by uuid default auth.uid(), created_at timestamptz default now());
alter table documents enable row level security;
create policy doc_read on documents for select using (organization_id=auth_org() and has_perm('documents.view'));
create policy doc_write on documents for all using (organization_id=auth_org() and has_perm('documents.manage')) with check (organization_id=auth_org() and has_perm('documents.manage') and storage_path like auth_org()::text||'/%');
