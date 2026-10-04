-- Checkout (atomic, stock-safe), payments ledger, support tickets.
insert into permissions(key) values ('tickets.view'),('tickets.manage') on conflict do nothing;
insert into role_permissions select r.id,p.key from roles r, permissions p where r.name='Organization Owner' and p.key in ('tickets.view','tickets.manage') on conflict do nothing;

create function place_order(p_items jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare org uuid:=auth_org(); c uuid; o uuid; it jsonb; pr products%rowtype; q int; tot numeric:=0;
begin
  if auth.uid() is null or org is null then raise exception 'not allowed'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'invalid cart'; end if;
  select id into c from customers where user_id=auth.uid() and organization_id=org;
  if c is null then
    insert into customers(organization_id,user_id,name,email) select org,id,coalesce(full_name,'Customer'),(select email from auth.users where id=auth.uid()) from profiles where id=auth.uid() returning id into c;
  end if;
  insert into orders(organization_id,customer_id) values(org,c) returning id into o;
  for it in select * from jsonb_array_elements(p_items) loop
    q:=(it->>'quantity')::int;
    select * into pr from products where id=(it->>'product_id')::uuid and organization_id=org and deleted_at is null for update;
    if not found or q is null or q<=0 or pr.stock<q then raise exception 'item unavailable'; end if;
    update products set stock=stock-q, updated_at=now() where id=pr.id;
    insert into order_items(order_id,product_id,quantity,unit_price) values(o,pr.id,q,pr.price);
    tot:=tot+pr.price*q;
  end loop;
  update orders set total=tot, currency=(select currency from organizations where id=org) where id=o;
  insert into audit_logs(organization_id,action,entity,entity_id,metadata) values(org,'order.placed','order',o::text,jsonb_build_object('total',tot));
  return o;
end $$;

create table payments(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, order_id uuid not null references orders, provider text not null check(provider in ('razorpay','stripe','mock')), provider_ref text, status text not null default 'pending' check(status in ('pending','paid','failed','refunded')), amount numeric(12,2) not null, currency text not null, created_at timestamptz default now());
alter table payments enable row level security;
create policy pay_read on payments for select using (organization_id=auth_org() and (has_perm('finance.view') or exists(select 1 from orders o where o.id=order_id)));
-- No insert/update policies: only the payment Edge Function (service role) writes payments.

create table tickets(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, created_by uuid not null default auth.uid(), subject text not null check(char_length(subject) between 3 and 160), category text default 'general', priority text not null default 'normal' check(priority in ('low','normal','high','urgent')), status text not null default 'open' check(status in ('open','in_progress','waiting','resolved','closed')), assigned_to uuid references profiles, created_at timestamptz default now());
create table ticket_messages(id uuid primary key default gen_random_uuid(), ticket_id uuid not null references tickets on delete cascade, author_id uuid not null default auth.uid(), body text not null check(char_length(body)<=5000), internal boolean not null default false, created_at timestamptz default now());
alter table tickets enable row level security; alter table ticket_messages enable row level security;
create policy t_read on tickets for select using (organization_id=auth_org() and (created_by=auth.uid() or has_perm('tickets.view')));
create policy t_ins on tickets for insert with check (organization_id=auth_org() and created_by=auth.uid());
create policy t_upd on tickets for update using (organization_id=auth_org() and has_perm('tickets.manage')) with check (organization_id=auth_org());
create policy tm_read on ticket_messages for select using (exists(select 1 from tickets t where t.id=ticket_id) and (not internal or has_perm('tickets.view')));
create policy tm_ins on ticket_messages for insert with check (author_id=auth.uid() and exists(select 1 from tickets t where t.id=ticket_id) and (not internal or has_perm('tickets.manage')));
