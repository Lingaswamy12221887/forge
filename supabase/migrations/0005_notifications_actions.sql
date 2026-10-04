create table notifications(id uuid primary key default gen_random_uuid(), organization_id uuid not null, user_id uuid not null references auth.users on delete cascade, title text not null, body text, link text, read_at timestamptz, created_at timestamptz default now());
create index on notifications(user_id, created_at desc);
create table notification_preferences(user_id uuid primary key references auth.users on delete cascade, email_enabled boolean not null default true, sms_enabled boolean not null default false, phone text check(phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'), updated_at timestamptz default now());
alter table notifications enable row level security; alter table notification_preferences enable row level security;
create policy n_read on notifications for select using (user_id=auth.uid());
create policy n_upd on notifications for update using (user_id=auth.uid()) with check (user_id=auth.uid());
revoke update on notifications from authenticated; grant update(read_at) on notifications to authenticated;
create policy np_all on notification_preferences for all using (user_id=auth.uid()) with check (user_id=auth.uid());
alter publication supabase_realtime add table notifications;

create function push_notification(p_org uuid,p_user uuid,p_title text,p_body text,p_link text) returns void language plpgsql security definer set search_path=public as $$
begin if p_user is not null then insert into notifications(organization_id,user_id,title,body,link) values(p_org,p_user,p_title,p_body,p_link); end if; end $$;
revoke all on function push_notification(uuid,uuid,text,text,text) from public, anon, authenticated;

create function trg_order_notify() returns trigger language plpgsql security definer set search_path=public as $$
declare u uuid:=(select user_id from customers where id=new.customer_id);
begin if tg_op='INSERT' then perform push_notification(new.organization_id,u,'Order placed','Order #'||left(new.id::text,8)||' was received.','/orders');
 elsif new.status is distinct from old.status then perform push_notification(new.organization_id,u,'Order update','Order #'||left(new.id::text,8)||' is now '||replace(new.status,'_',' ')||'.','/orders'); end if; return null; end $$;
create trigger orders_notify after insert or update of status on orders for each row execute function trg_order_notify();
create function trg_quote_notify() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.status is not distinct from old.status then return null; end if;
 if new.status='sent' then perform push_notification(new.organization_id,(select user_id from customers where id=new.customer_id),'New quotation',new.number||' is ready for your review.','/quotes');
 elsif new.status in ('accepted','rejected') then perform push_notification(new.organization_id,new.created_by,'Quotation '||new.status,new.number||' was '||new.status||' by the customer.','/quotes'); end if; return null; end $$;
create trigger quotes_notify after update of status on quotations for each row execute function trg_quote_notify();
create function trg_ticket_notify() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.status is distinct from old.status then perform push_notification(new.organization_id,new.created_by,'Ticket update','"'||left(new.subject,60)||'" is now '||replace(new.status,'_',' ')||'.','/support'); end if; return null; end $$;
create trigger tickets_notify after update of status on tickets for each row execute function trg_ticket_notify();
create function trg_proto_notify() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.status is distinct from old.status then perform push_notification(new.organization_id,new.requested_by,'Project update','"'||left(new.title,60)||'" moved to '||new.status||'.','/prototyping'); end if; return null; end $$;
create trigger proto_notify after update of status on prototype_requests for each row execute function trg_proto_notify();
create function trg_cert_notify() returns trigger language plpgsql security definer set search_path=public as $$
begin perform push_notification(new.organization_id,new.user_id,'Certificate issued','Your certificate ID is '||new.code||'.','/training'); return null; end $$;
create trigger cert_notify after insert on certificates for each row execute function trg_cert_notify();

-- Cancels an order and restores stock. Paid orders need a manual refund first.
create function cancel_order(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare st text;
begin if not has_perm('orders.cancel') then raise exception 'forbidden'; end if;
 select status into st from orders where id=p_id and organization_id=auth_org() for update;
 if st is null or st not in ('pending','confirmed','processing') then raise exception 'not cancellable'; end if;
 if exists(select 1 from payments where order_id=p_id and status='paid') then raise exception 'refund required'; end if;
 update products p set stock=p.stock+s.q from (select product_id, sum(quantity) q from order_items where order_id=p_id group by product_id) s where p.id=s.product_id;
 update orders set status='cancelled' where id=p_id;
 insert into audit_logs(organization_id,action,entity,entity_id) values(auth_org(),'order.cancelled','order',p_id::text); end $$;
