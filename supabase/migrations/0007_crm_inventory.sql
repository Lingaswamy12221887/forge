insert into permissions(key) values ('crm.view'),('crm.manage') on conflict do nothing;
insert into role_permissions select r.id,p.key from roles r, permissions p where r.name='Organization Owner' and p.key in ('crm.view','crm.manage') on conflict do nothing;
create table leads(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, name text not null check(char_length(name) between 2 and 120), company text, email text, phone text, stage text not null default 'lead' check(stage in ('lead','qualified','contacted','proposal','negotiation','won','lost')), value numeric(12,2) default 0 check(value>=0), notes text, owner_id uuid default auth.uid(), created_at timestamptz default now());
alter table leads enable row level security;
create policy lead_read on leads for select using (organization_id=auth_org() and has_perm('crm.view'));
create policy lead_write on leads for all using (organization_id=auth_org() and has_perm('crm.manage')) with check (organization_id=auth_org() and has_perm('crm.manage'));

create table suppliers(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, name text not null check(char_length(name) between 2 and 120), email text, phone text, created_at timestamptz default now());
create table purchase_orders(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, supplier_id uuid not null references suppliers, number text not null, status text not null default 'draft' check(status in ('draft','ordered','received','cancelled')), created_by uuid default auth.uid(), created_at timestamptz default now(), unique(organization_id,number));
create table purchase_order_items(id uuid primary key default gen_random_uuid(), po_id uuid not null references purchase_orders on delete cascade, product_id uuid not null references products, quantity int not null check(quantity>0), unit_cost numeric(12,2) not null check(unit_cost>=0));
create table inventory_movements(id uuid primary key default gen_random_uuid(), organization_id uuid not null, product_id uuid not null references products, delta int not null check(delta<>0), reason text not null check(reason in ('purchase_receipt','adjustment','sale','return')), ref text, created_by uuid default auth.uid(), created_at timestamptz default now());
create index on inventory_movements(product_id, created_at desc);
alter table suppliers enable row level security; alter table purchase_orders enable row level security; alter table purchase_order_items enable row level security; alter table inventory_movements enable row level security;
create policy sup_read on suppliers for select using (organization_id=auth_org() and has_perm('inventory.view'));
create policy sup_write on suppliers for all using (organization_id=auth_org() and has_perm('inventory.manage')) with check (organization_id=auth_org() and has_perm('inventory.manage'));
create policy po_read on purchase_orders for select using (organization_id=auth_org() and has_perm('inventory.view'));
create policy po_write on purchase_orders for all using (organization_id=auth_org() and has_perm('inventory.manage')) with check (organization_id=auth_org() and has_perm('inventory.manage'));
create policy poi_read on purchase_order_items for select using (exists(select 1 from purchase_orders p where p.id=po_id));
create policy poi_write on purchase_order_items for all using (has_perm('inventory.manage') and exists(select 1 from purchase_orders p where p.id=po_id and p.status='draft')) with check (has_perm('inventory.manage') and exists(select 1 from purchase_orders p where p.id=po_id and p.status='draft'));
create policy mv_read on inventory_movements for select using (organization_id=auth_org() and has_perm('inventory.view'));
-- Stock changes happen only via these functions, so every change leaves a movement record.
create function receive_purchase_order(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare po purchase_orders%rowtype; it record;
begin if not has_perm('inventory.manage') then raise exception 'forbidden'; end if;
 select * into po from purchase_orders where id=p_id and organization_id=auth_org() for update; if not found or po.status<>'ordered' then raise exception 'not receivable'; end if;
 for it in select product_id, sum(quantity)::int q from purchase_order_items where po_id=p_id group by product_id loop
   update products set stock=stock+it.q, updated_at=now() where id=it.product_id and organization_id=po.organization_id;
   insert into inventory_movements(organization_id,product_id,delta,reason,ref) values(po.organization_id,it.product_id,it.q,'purchase_receipt',po.number); end loop;
 update purchase_orders set status='received' where id=p_id;
 insert into audit_logs(organization_id,action,entity,entity_id) values(po.organization_id,'po.received','purchase_order',p_id::text); end $$;
create function adjust_stock(p_product uuid, p_delta int, p_note text) returns void language plpgsql security definer set search_path=public as $$
declare s int;
begin if not has_perm('inventory.manage') then raise exception 'forbidden'; end if; if p_delta=0 then raise exception 'no change'; end if;
 update products set stock=stock+p_delta, updated_at=now() where id=p_product and organization_id=auth_org() returning stock into s;
 if s is null then raise exception 'not found'; end if; -- stock >= 0 check constraint rejects negatives
 insert into inventory_movements(organization_id,product_id,delta,reason,ref) values(auth_org(),p_product,p_delta,'adjustment',left(p_note,120));
 insert into audit_logs(organization_id,action,entity,entity_id,metadata) values(auth_org(),'stock.adjusted','product',p_product::text,jsonb_build_object('delta',p_delta,'note',p_note)); end $$;
