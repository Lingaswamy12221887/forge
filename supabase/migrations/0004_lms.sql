create table courses(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, title text not null check(char_length(title) between 3 and 160), description text, level text not null default 'beginner' check(level in ('beginner','intermediate','advanced')), published boolean not null default false, instructor_id uuid default auth.uid(), created_at timestamptz default now());
create table lessons(id uuid primary key default gen_random_uuid(), course_id uuid not null references courses on delete cascade, position int not null, title text not null, content text, video_url text, unique(course_id,position));
create table enrollments(id uuid primary key default gen_random_uuid(), organization_id uuid not null, course_id uuid not null references courses on delete cascade, user_id uuid not null default auth.uid(), created_at timestamptz default now(), completed_at timestamptz, unique(course_id,user_id));
create table lesson_progress(user_id uuid not null default auth.uid(), lesson_id uuid not null references lessons on delete cascade, completed_at timestamptz default now(), primary key(user_id,lesson_id));
create table certificates(id uuid primary key default gen_random_uuid(), code text not null unique, organization_id uuid not null, course_id uuid not null references courses, user_id uuid not null, issued_at timestamptz default now(), unique(course_id,user_id));
create index on lessons(course_id); create index on enrollments(user_id);
alter table courses enable row level security; alter table lessons enable row level security; alter table enrollments enable row level security; alter table lesson_progress enable row level security; alter table certificates enable row level security;
create policy c_read on courses for select using (organization_id=auth_org() and (published or has_perm('training.manage')));
create policy c_write on courses for all using (organization_id=auth_org() and has_perm('training.manage')) with check (organization_id=auth_org() and has_perm('training.manage'));
create policy l_read on lessons for select using (exists(select 1 from courses c where c.id=course_id)); -- inherits course visibility
create policy l_write on lessons for all using (has_perm('training.manage') and exists(select 1 from courses c where c.id=course_id)) with check (has_perm('training.manage') and exists(select 1 from courses c where c.id=course_id));
create policy e_read on enrollments for select using (organization_id=auth_org() and (user_id=auth.uid() or has_perm('training.manage')));
create policy lp_read on lesson_progress for select using (user_id=auth.uid());
create policy cert_read on certificates for select using (organization_id=auth_org() and (user_id=auth.uid() or has_perm('training.manage')));
-- Writes to enrollments/progress/certificates happen only through these functions.
create function enroll(p_course uuid) returns void language plpgsql security definer set search_path=public as $$
begin if not exists(select 1 from courses where id=p_course and organization_id=auth_org() and published) then raise exception 'not available'; end if;
  insert into enrollments(organization_id,course_id,user_id) values(auth_org(),p_course,auth.uid()) on conflict do nothing; end $$;
create function complete_lesson(p_lesson uuid) returns text language plpgsql security definer set search_path=public as $$
declare cid uuid; total int; done int; code text;
begin select l.course_id into cid from lessons l join courses c on c.id=l.course_id where l.id=p_lesson and c.organization_id=auth_org();
  if cid is null or not exists(select 1 from enrollments where course_id=cid and user_id=auth.uid()) then raise exception 'not enrolled'; end if;
  insert into lesson_progress(user_id,lesson_id) values(auth.uid(),p_lesson) on conflict do nothing;
  select count(*) into total from lessons where course_id=cid;
  select count(*) into done from lesson_progress lp join lessons l on l.id=lp.lesson_id where l.course_id=cid and lp.user_id=auth.uid();
  if done>=total then
    update enrollments set completed_at=coalesce(completed_at,now()) where course_id=cid and user_id=auth.uid();
    code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
    insert into certificates(code,organization_id,course_id,user_id) values(code,auth_org(),cid,auth.uid()) on conflict do nothing;
    insert into audit_logs(organization_id,action,entity,entity_id) values(auth_org(),'certificate.issued','course',cid::text);
    return (select c.code from certificates c where c.course_id=cid and c.user_id=auth.uid());
  end if; return null; end $$;
-- Public: reveals only name, course, issuer and date for a valid code.
create function verify_certificate(p_code text) returns table(holder text, course text, issuer text, issued_at timestamptz) language sql stable security definer set search_path=public as $$
  select p.full_name, c.title, o.name, ce.issued_at from certificates ce join courses c on c.id=ce.course_id join organizations o on o.id=ce.organization_id join profiles p on p.id=ce.user_id where ce.code=upper(trim(p_code)) $$;
grant execute on function verify_certificate(text) to anon, authenticated;
