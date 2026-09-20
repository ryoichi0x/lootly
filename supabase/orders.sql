create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  amount_usdc numeric(12,2) not null check (amount_usdc > 0),
  status text not null default 'pending' check (status in ('pending','processing','delivered','completed','cancelled','disputed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_buyer_id_idx on public.orders(buyer_id);
create index if not exists orders_seller_id_idx on public.orders(seller_id);
create index if not exists orders_listing_id_idx on public.orders(listing_id);
create unique index if not exists one_active_order_per_listing on public.orders(listing_id) where status in ('pending','processing','delivered','disputed');
alter table public.orders enable row level security;

drop policy if exists "Users can view related orders" on public.orders;
drop policy if exists "Buyers create their own orders" on public.orders;
drop policy if exists "Buyers update their own orders" on public.orders;
drop policy if exists "Sellers update their listing orders" on public.orders;
create policy "Users can view related orders" on public.orders for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Buyers create their own orders" on public.orders for insert with check (auth.uid() = buyer_id);
-- Status changes go through the functions below so IDs and transitions cannot be forged.

create or replace function public.create_order(p_listing_id uuid)
returns public.orders language plpgsql security definer set search_path = public as $$
declare l public.listings; o public.orders; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'You must be logged in.'; end if;
  select * into l from public.listings where id = p_listing_id for update;
  if not found or l.status <> 'active' then raise exception 'This listing is no longer available.'; end if;
  if l.seller_id = uid then raise exception 'You cannot buy your own listing.'; end if;
  if exists (select 1 from public.orders where listing_id = l.id and status in ('pending','processing','delivered','disputed')) then raise exception 'This listing already has an active order.'; end if;
  insert into public.orders(listing_id,buyer_id,seller_id,amount_usdc,status) values (l.id,uid,l.seller_id,l.price_usdc,'pending') returning * into o;
  return o;
end; $$;

a create or replace function public.update_order_as_seller(p_order_id uuid, p_status text)
returns public.orders language plpgsql security definer set search_path = public as $$
declare o public.orders; uid uuid := auth.uid();
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.seller_id <> uid then raise exception 'Order not found.'; end if;
  if (o.status,p_status) not in (('pending','processing'),('processing','delivered')) then raise exception 'Invalid seller status transition.'; end if;
  update public.orders set status=p_status, updated_at=now() where id=o.id returning * into o; return o;
end; $$;

create or replace function public.update_order_as_buyer(p_order_id uuid, p_status text)
returns public.orders language plpgsql security definer set search_path = public as $$
declare o public.orders; uid uuid := auth.uid();
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.buyer_id <> uid then raise exception 'Order not found.'; end if;
  if (o.status,p_status) not in (('delivered','completed'),('pending','cancelled')) then raise exception 'Invalid buyer status transition.'; end if;
  update public.orders set status=p_status, updated_at=now() where id=o.id returning * into o; return o;
end; $$;

create or replace function public.set_order_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders for each row execute procedure public.set_order_updated_at();
