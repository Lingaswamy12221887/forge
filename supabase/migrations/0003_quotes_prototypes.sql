insert into permissions(key) values ('quotations.view'),('quotations.manage'),('prototypes.manage') on conflict do nothing;
insert into role_permissions select r.id,p.key from roles r, permissions p where r.name='Organization Owner' and p.key in ('quotations.view','quotations.manage','prototypes.manage') on conflict do nothing;

create table quotations(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, customer_id uuid not null references customers, number text not null, status text not null default 'draft' check(status in ('draft','sent','viewed','accepted','rejected','expired')), tax_rate numeric(5,2) not null default 0 check(tax_rate between 0 and 100), subtotal numeric(12,2) not null default 0, total numeric(12,2) not null default 0, valid_until date, notes text, created_by uuid default auth.uid(), created_at timestamptz default now(), unique(organization_id,number));
create table quotation_items(id uuid primary key default gen_random_uuid(), quotation_id uuid not null references quotations on delete cascade, description text not null, quantity numeric(10,2) not null check(quantity>0), unit_price numeric(12,2) not null check(unit_price>=0));
create function recalc_quote() returns trigger language plpgsql security definer set search_path=public as $$
declare q uuid:=coalesce(new.quotation_id,old.quotation_id);
begin update quotations set subtotal=coalesce((select sum(quantity*unit_price) from quotation_items where quotation_id=q),0) where id=q;
  update quotations set total=round(subtotal*(1+tax_rate/100),2) where id=q; return null; end $$;
create trigger quote_items_total after insert or update or delete on quotation_items for each row execute function recalc_quote();
alter table quotations enable row level security; alter table quotation_items enable row level security;
create policy q_read on quotations for select using (organization_id=auth_org() and (has_perm('quotations.view') or (status<>'draft' and customer_id in (select id from customers where user_id=auth.uid()))));
create policy q_write on quotations for all using (organization_id=auth_org() and has_perm('quotations.manage')) with check (organization_id=auth_org() and has_perm('quotations.manage'));
create policy qi_read on quotation_items for select using (exists(select 1 from quotations q where q.id=quotation_id)); -- inherits quotations RLS
create policy qi_write on quotation_items for all using (has_perm('quotations.manage') and exists(select 1 from quotations q where q.id=quotation_id)) with check (has_perm('quotations.manage') and exists(select 1 from quotations q where q.id=quotation_id));
-- Customers respond through this function only (cannot edit amounts).
create function respond_quotation(p_id uuid, p_accept boolean) returns void language plpgsql security definer set search_path=public as $$
declare q quotations%rowtype;
begin select * into q from quotations where id=p_id and organization_id=auth_org() and customer_id in (select id from customers where user_id=auth.uid()) for update;
  if not found or q.status not in ('sent','viewed') then raise exception 'not available'; end if;
  if q.valid_until is not null and q.valid_until < current_date then update quotations set status='expired' where id=p_id; raise exception 'expired'; end if;
  update quotations set status=case when p_accept then 'accepted' else 'rejected' end where id=p_id;
  insert into audit_logs(organization_id,action,entity,entity_id) values(q.organization_id,case when p_accept then 'quotation.accepted' else 'quotation.rejected' end,'quotation',p_id::text); end $$;

create table prototype_requests(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, requested_by uuid not null default auth.uid(), title text not null check(char_length(title) between 3 and 160), description text, budget numeric(12,2), quantity int check(quantity>0), target_date date, status text not null default 'requested' check(status in ('requested','review','requirements','quotation','approved','design','prototype','testing','revision','production','delivery','completed')), assigned_to uuid references profiles, created_at timestamptz default now());
alter table prototype_requests enable row level security;
create policy pr_read on prototype_requests for select using (organization_id=auth_org() and (requested_by=auth.uid() or has_perm('prototypes.manage')));
create policy pr_ins on prototype_requests for insert with check (organization_id=auth_org() and requested_by=auth.uid() and status='requested');
create policy pr_upd on prototype_requests for update using (organization_id=auth_org() and has_perm('prototypes.manage')) with check (organization_id=auth_org());
-- Enforces the workflow: next stage only; revision loops back to prototype.
create function advance_prototype(p_id uuid, p_to text) returns void language plpgsql security definer set search_path=public as $$
declare flow text[]:=array['requested','review','requirements','quotation','approved','design','prototype','testing','revision','production','delivery','completed']; cur text;
begin if not has_perm('prototypes.manage') then raise exception 'forbidden'; end if;
  select status into cur from prototype_requests where id=p_id and organization_id=auth_org() for update; if cur is null then raise exception 'not found'; end if;
  if not (array_position(flow,p_to)=array_position(flow,cur)+1 or (cur='revision' and p_to='prototype') or (cur='testing' and p_to='production')) then raise exception 'invalid transition'; end if;
  update prototype_requests set status=p_to where id=p_id;
  insert into audit_logs(organization_id,action,entity,entity_id,metadata) values(auth_org(),'prototype.status','prototype',p_id::text,jsonb_build_object('from',cur,'to',p_to)); end $$;
