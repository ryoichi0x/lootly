create table if not exists public.wallet_balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance_usdc numeric(12,2) not null default 1000 check (balance_usdc >= 0),
  locked_usdc numeric(12,2) not null default 0 check (locked_usdc >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.escrows (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  amount_usdc numeric(12,2) not null check (amount_usdc > 0),
  status text not null check (status in ('awaiting_funding','funded','released','refunded','disputed')),
  created_at timestamptz not null default now(),
  funded_at timestamptz,
  released_at timestamptz,
  cancelled_at timestamptz
);
create index if not exists escrows_buyer_id_idx on public.escrows(buyer_id);
create index if not exists escrows_seller_id_idx on public.escrows(seller_id);
create index if not exists escrows_order_id_idx on public.escrows(order_id);

alter table public.wallet_balances enable row level security;
alter table public.escrows enable row level security;
drop policy if exists "Users can view their wallet" on public.wallet_balances;
drop policy if exists "Users can view related escrows" on public.escrows;
create policy "Users can view their wallet" on public.wallet_balances for select using (auth.uid() = user_id);
create policy "Users can view related escrows" on public.escrows for select using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Extend the existing signup trigger so every new user starts with a clearly simulated balance.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username) values (new.id, coalesce(new.raw_user_meta_data->>'username', 'gamer_' || substr(new.id::text, 1, 8)));
  insert into public.wallet_balances (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end; $$;

insert into public.wallet_balances (user_id)
select id from public.profiles on conflict (user_id) do nothing;

create or replace function public.set_wallet_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists wallet_balances_updated_at on public.wallet_balances;
create trigger wallet_balances_updated_at before update on public.wallet_balances for each row execute procedure public.set_wallet_updated_at();

create or replace function public.fund_order(p_order_id uuid)
returns public.escrows language plpgsql security definer set search_path = public as $$
declare o public.orders; e public.escrows; uid uuid := auth.uid(); updated integer;
begin
  if uid is null then raise exception 'You must be logged in.'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.buyer_id <> uid then raise exception 'Order not found.'; end if;
  if o.status <> 'pending' then raise exception 'This order is not awaiting funding.'; end if;
  if exists (select 1 from public.escrows where order_id = o.id) then raise exception 'This order has already been funded.'; end if;
  insert into public.wallet_balances(user_id) values (uid) on conflict (user_id) do nothing;
  update public.wallet_balances set balance_usdc = balance_usdc - o.amount_usdc, locked_usdc = locked_usdc + o.amount_usdc where user_id = uid and balance_usdc >= o.amount_usdc;
  get diagnostics updated = row_count;
  if updated <> 1 then raise exception 'Insufficient simulated balance.'; end if;
  insert into public.escrows(order_id,buyer_id,seller_id,amount_usdc,status,funded_at) values (o.id,o.buyer_id,o.seller_id,o.amount_usdc,'funded',now()) returning * into e;
  update public.orders set status='processing', updated_at=now() where id=o.id;
  return e;
end; $$;

create or replace function public.release_order(p_order_id uuid)
returns public.escrows language plpgsql security definer set search_path = public as $$
declare o public.orders; e public.escrows; uid uuid := auth.uid(); updated integer;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.buyer_id <> uid or o.status <> 'delivered' then raise exception 'Order is not ready for release.'; end if;
  select * into e from public.escrows where order_id=o.id for update;
  if not found or e.status <> 'funded' or e.amount_usdc <> o.amount_usdc then raise exception 'Escrow is not funded.'; end if;
  update public.wallet_balances set locked_usdc=locked_usdc-e.amount_usdc where user_id=e.buyer_id and locked_usdc >= e.amount_usdc;
  get diagnostics updated = row_count;
  if updated <> 1 then raise exception 'Locked balance is inconsistent.'; end if;
  insert into public.wallet_balances(user_id,balance_usdc,locked_usdc) values (e.seller_id,e.amount_usdc,0) on conflict (user_id) do update set balance_usdc=public.wallet_balances.balance_usdc+excluded.balance_usdc;
  update public.escrows set status='released', released_at=now() where id=e.id;
  update public.orders set status='completed', updated_at=now() where id=o.id;
  select * into e from public.escrows where id=e.id;
  return e;
end; $$;

create or replace function public.refund_order(p_order_id uuid)
returns public.escrows language plpgsql security definer set search_path = public as $$
declare o public.orders; e public.escrows; uid uuid := auth.uid(); updated integer;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.buyer_id <> uid or o.status <> 'processing' then raise exception 'Only a processing order can be refunded.'; end if;
  select * into e from public.escrows where order_id=o.id for update;
  if not found or e.status <> 'funded' then raise exception 'Escrow is not refundable.'; end if;
  update public.wallet_balances set locked_usdc=locked_usdc-e.amount_usdc, balance_usdc=balance_usdc+e.amount_usdc where user_id=e.buyer_id and locked_usdc >= e.amount_usdc;
  get diagnostics updated = row_count;
  if updated <> 1 then raise exception 'Locked balance is inconsistent.'; end if;
  update public.escrows set status='refunded', cancelled_at=now() where id=e.id;
  update public.orders set status='cancelled', updated_at=now() where id=o.id;
  select * into e from public.escrows where id=e.id;
  return e;
end; $$;

create or replace function public.dispute_order(p_order_id uuid)
returns public.escrows language plpgsql security definer set search_path = public as $$
declare o public.orders; e public.escrows; uid uuid := auth.uid();
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found or (o.buyer_id <> uid and o.seller_id <> uid) then raise exception 'Order not found.'; end if;
  select * into e from public.escrows where order_id=o.id for update;
  if not found or e.status <> 'funded' or o.status not in ('processing','delivered') then raise exception 'This order cannot be disputed.'; end if;
  update public.escrows set status='disputed' where id=e.id;
  select * into e from public.escrows where id=e.id;
  return e;
end; $$;
