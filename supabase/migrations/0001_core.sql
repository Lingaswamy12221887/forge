-- Forge core schema: multi-tenant, RBAC, catalog, orders, AI, audit. RLS enforced on every table.
create extension if not exists pgcrypto;

create table organizations(id uuid primary key default gen_random_uuid(), name text not null, currency text not null default 'INR' check (currency in ('INR','USD','EUR')), timezone text default 'UTC', created_by uuid, created_at timestamptz default now(), deleted_at timestamptz);
create table profiles(id uuid primary key references auth.users on delete cascade, organization_id uuid references organizations, full_name text, is_super_admin boolean not null default false, created_at timestamptz default now());
create table roles(id uuid primary key default gen_random_uuid(), organization_id uuid references organizations on delete cascade, name text not null, is_system boolean default false, unique(organization_id,name));
create table permissions(key text primary key, description text);
create table role_permissions(role_id uuid references roles on delete cascade, permission_key text references permissions on delete cascade, primary key(role_id,permission_key));
create table user_roles(user_id uuid references profiles on delete cascade, role_id uuid references roles on delete cascade, primary key(user_id,role_id));
create table product_categories(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, name text not null, unique(organization_id,name));
create table products(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, category_id uuid references product_categories, name text not null, slug text not null, sku text not null, description text, price numeric(12,2) not null check(price>=0), currency text not null default 'INR', stock int not null default 0 check(stock>=0), min_stock int not null default 5, image_url text, created_by uuid default auth.uid(), created_at timestamptz default now(), updated_at timestamptz default now(), deleted_at timestamptz,
  search tsvector generated always as (to_tsvector('english', coalesce(name,'')||' '||coalesce(sku,'')||' '||coalesce(description,''))) stored, unique(organization_id,sku), unique(organization_id,slug));
create index products_search_idx on products using gin(search); create index products_org_idx on products(organization_id);
create table customers(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, user_id uuid references auth.users, name text not null, email text, phone text, created_at timestamptz default now());
create table orders(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, customer_id uuid references customers, status text not null default 'pending' check(status in ('pending','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled','returned','refunded')), total numeric(12,2) not null default 0, currency text default 'INR', created_at timestamptz default now());
create index orders_org_idx on orders(organization_id, created_at desc);
create table order_items(id uuid primary key default gen_random_uuid(), order_id uuid not null references orders on delete cascade, product_id uuid references products, quantity int not null check(quantity>0), unit_price numeric(12,2) not null);
create table audit_logs(id bigserial primary key, organization_id uuid, user_id uuid default auth.uid(), action text not null, entity text, entity_id text, metadata jsonb default '{}', created_at timestamptz default now());
create table ai_conversations(id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations on delete cascade, user_id uuid not null default auth.uid(), title text, created_at timestamptz default now());
create table ai_messages(id uuid primary key default gen_random_uuid(), conversation_id uuid not null references ai_conversations on delete cascade, role text not null check(role in ('user','assistant')), content text not null, created_at timestamptz default now());
create table ai_usage(id bigserial primary key, organization_id uuid not null, user_id uuid not null, model text, input_tokens int, output_tokens int, created_at timestamptz default now());

-- ---------- helpers (security definer avoids RLS recursion) ----------
create function auth_org() returns uuid language sql stable security definer set search_path=public as $$ select organization_id from profiles where id=auth.uid() $$;
create function is_super_admin() returns boolean language sql stable security definer set search_path=public as $$ select coalesce((select is_super_admin from profiles where id=auth.uid()),false) $$;
create function has_perm(p text) returns boolean language sql stable security definer set search_path=public as $$
  select is_super_admin() or exists(select 1 from user_roles ur join role_permissions rp on rp.role_id=ur.role_id where ur.user_id=auth.uid() and rp.permission_key=p) $$;
create function my_permissions() returns text[] language sql stable security definer set search_path=public as $$
  select coalesce(array_agg(distinct rp.permission_key),'{}') from user_roles ur join role_permissions rp on rp.role_id=ur.role_id where ur.user_id=auth.uid() $$;

create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,full_name) values(new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1))); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Creates an org, makes caller the owner with every permission. Callable once per user.
create function create_organization(p_name text, p_currency text default 'INR') returns uuid language plpgsql security definer set search_path=public as $$
declare o uuid; r uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if (select organization_id from profiles where id=auth.uid()) is not null then raise exception 'already in an organization'; end if;
  insert into organizations(name,currency,created_by) values(trim(p_name),p_currency,auth.uid()) returning id into o;
  insert into roles(organization_id,name,is_system) values(o,'Organization Owner',true) returning id into r;
  insert into role_permissions select r, key from permissions;
  update profiles set organization_id=o where id=auth.uid();
  insert into user_roles values(auth.uid(), r);
  insert into audit_logs(organization_id,action,entity,entity_id) values(o,'organization.created','organization',o::text);
  return o;
end $$;

-- ---------- RLS ----------
alter table organizations enable row level security; alter table profiles enable row level security; alter table roles enable row level security;
alter table permissions enable row level security; alter table role_permissions enable row level security; alter table user_roles enable row level security;
alter table product_categories enable row level security; alter table products enable row level security; alter table customers enable row level security;
alter table orders enable row level security; alter table order_items enable row level security; alter table audit_logs enable row level security;
alter table ai_conversations enable row level security; alter table ai_messages enable row level security; alter table ai_usage enable row level security;

create policy org_read on organizations for select using (id=auth_org() or is_super_admin());
create policy org_update on organizations for update using (id=auth_org() and has_perm('settings.manage'));
create policy prof_read on profiles for select using (id=auth.uid() or organization_id=auth_org() or is_super_admin());
create policy prof_self_update on profiles for update using (id=auth.uid()) with check (id=auth.uid() and organization_id is not distinct from auth_org() and is_super_admin=false);
create policy perm_read on permissions for select using (auth.uid() is not null);
create policy roles_read on roles for select using (organization_id=auth_org());
create policy roles_write on roles for all using (organization_id=auth_org() and has_perm('users.update')) with check (organization_id=auth_org() and has_perm('users.update'));
create policy rp_read on role_permissions for select using (exists(select 1 from roles r where r.id=role_id and r.organization_id=auth_org()));
create policy rp_write on role_permissions for all using (exists(select 1 from roles r where r.id=role_id and r.organization_id=auth_org()) and has_perm('users.update')) with check (exists(select 1 from roles r where r.id=role_id and r.organization_id=auth_org()) and has_perm('users.update'));
create policy ur_read on user_roles for select using (user_id=auth.uid() or exists(select 1 from profiles p where p.id=user_id and p.organization_id=auth_org()));
create policy ur_write on user_roles for all using (has_perm('users.update') and exists(select 1 from profiles p where p.id=user_id and p.organization_id=auth_org())) with check (has_perm('users.update') and exists(select 1 from profiles p where p.id=user_id and p.organization_id=auth_org()));

create policy cat_read on product_categories for select using (organization_id=auth_org());
create policy cat_write on product_categories for all using (organization_id=auth_org() and has_perm('products.update')) with check (organization_id=auth_org() and has_perm('products.update'));
create policy prod_read on products for select using (organization_id=auth_org());
create policy prod_ins on products for insert with check (organization_id=auth_org() and has_perm('products.create'));
create policy prod_upd on products for update using (organization_id=auth_org() and has_perm('products.update')) with check (organization_id=auth_org());
create policy prod_del on products for delete using (organization_id=auth_org() and has_perm('products.delete'));

-- Customers see only their own record; staff with orders.view see the org's.
create policy cust_read on customers for select using (organization_id=auth_org() and (user_id=auth.uid() or has_perm('orders.view')));
create policy cust_write on customers for all using (organization_id=auth_org() and has_perm('orders.create')) with check (organization_id=auth_org());
create policy ord_read on orders for select using (organization_id=auth_org() and (has_perm('orders.view') or customer_id in (select id from customers where user_id=auth.uid())));
create policy ord_ins on orders for insert with check (organization_id=auth_org() and has_perm('orders.create'));
create policy ord_upd on orders for update using (organization_id=auth_org() and has_perm('orders.update')) with check (organization_id=auth_org());
create policy oi_read on order_items for select using (exists(select 1 from orders o where o.id=order_id));  -- inherits orders RLS
create policy oi_write on order_items for all using (exists(select 1 from orders o where o.id=order_id and has_perm('orders.update'))) with check (exists(select 1 from orders o where o.id=order_id and has_perm('orders.update')));

create policy audit_read on audit_logs for select using (organization_id=auth_org() and has_perm('settings.manage'));
create policy audit_ins on audit_logs for insert with check (organization_id=auth_org() and user_id=auth.uid());
create policy aic_own on ai_conversations for all using (user_id=auth.uid() and organization_id=auth_org()) with check (user_id=auth.uid() and organization_id=auth_org());
create policy aim_own on ai_messages for all using (exists(select 1 from ai_conversations c where c.id=conversation_id and c.user_id=auth.uid())) with check (exists(select 1 from ai_conversations c where c.id=conversation_id and c.user_id=auth.uid()));
create policy aiu_read on ai_usage for select using (organization_id=auth_org() and has_perm('settings.manage'));

-- storage buckets (private; access via signed URLs)
insert into storage.buckets(id,name,public) values ('products','products',false),('documents','documents',false),('cad','cad',false) on conflict do nothing;
create policy org_files on storage.objects for all to authenticated
  using (bucket_id in ('products','documents','cad') and (storage.foldername(name))[1]=auth_org()::text)
  with check (bucket_id in ('products','documents','cad') and (storage.foldername(name))[1]=auth_org()::text);

insert into permissions(key) values ('users.view'),('users.create'),('users.update'),('users.delete'),('products.view'),('products.create'),('products.update'),('products.delete'),
 ('orders.view'),('orders.create'),('orders.update'),('orders.cancel'),('inventory.view'),('inventory.manage'),('projects.view'),('projects.create'),('projects.manage'),
 ('training.view'),('training.manage'),('finance.view'),('finance.manage'),('reports.view'),('reports.export'),('settings.manage');
