create table project_tasks(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, prototype_id uuid not null references prototype_requests on delete cascade, title text not null check(char_length(title) between 2 and 200), status text not null default 'todo' check(status in ('todo','doing','done')), assigned_to uuid references profiles, due_date date, created_by uuid default auth.uid(), created_at timestamptz default now());
create table project_comments(id uuid primary key default gen_random_uuid(), prototype_id uuid not null references prototype_requests on delete cascade, author_id uuid not null default auth.uid(), body text not null check(char_length(body) between 1 and 4000), created_at timestamptz default now());
create index on project_tasks(prototype_id); create index on project_comments(prototype_id);
alter table project_tasks enable row level security; alter table project_comments enable row level security;
-- Visibility inherits prototype_requests RLS (requester or prototypes.manage within the org).
create policy pt_read on project_tasks for select using (organization_id=auth_org() and exists(select 1 from prototype_requests p where p.id=prototype_id));
create policy pt_write on project_tasks for all using (organization_id=auth_org() and has_perm('prototypes.manage')) with check (organization_id=auth_org() and has_perm('prototypes.manage'));
create policy pc_read on project_comments for select using (exists(select 1 from prototype_requests p where p.id=prototype_id));
create policy pc_ins on project_comments for insert with check (author_id=auth.uid() and exists(select 1 from prototype_requests p where p.id=prototype_id));

create table invoices(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, order_id uuid not null unique references orders, number text not null, total numeric(12,2) not null, currency text not null, status text not null default 'issued' check(status in ('issued','paid','void')), issued_at timestamptz default now(), unique(organization_id,number));
create table expenses(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, description text not null check(char_length(description) between 2 and 200), category text not null default 'general', amount numeric(12,2) not null check(amount>0), incurred_on date not null default current_date, created_by uuid default auth.uid());
alter table invoices enable row level security; alter table expenses enable row level security;
create policy inv_read on invoices for select using (organization_id=auth_org() and (has_perm('finance.view') or exists(select 1 from orders o where o.id=order_id)));
create policy exp_read on expenses for select using (organization_id=auth_org() and has_perm('finance.view'));
create policy exp_write on expenses for all using (organization_id=auth_org() and has_perm('finance.manage')) with check (organization_id=auth_org() and has_perm('finance.manage'));
create function create_invoice(p_order uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare o orders%rowtype; i uuid;
begin if not has_perm('finance.manage') then raise exception 'forbidden'; end if;
 select * into o from orders where id=p_order and organization_id=auth_org(); if not found or o.status in ('cancelled','pending') then raise exception 'order not invoiceable'; end if;
 insert into invoices(organization_id,order_id,number,total,currency,status) values(o.organization_id,o.id,'INV-'||to_char(now(),'YYYYMM')||'-'||upper(left(o.id::text,6)),o.total,o.currency,
   case when exists(select 1 from payments where order_id=o.id and status='paid') then 'paid' else 'issued' end) returning id into i;
 insert into audit_logs(organization_id,action,entity,entity_id) values(o.organization_id,'invoice.created','invoice',i::text); return i; end $$;
