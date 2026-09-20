create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  game text not null,
  title text not null,
  price_usdc numeric(12,2) not null check (price_usdc > 0),
  rank text,
  level integer check (level is null or level > 0),
  items text[] not null default '{}',
  description text not null,
  image_url text,
  status text not null default 'active' check (status in ('active', 'sold', 'draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
create policy "Profiles are publicly readable" on public.profiles for select using (true);
create policy "Users create their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update their own profile" on public.profiles for update using (auth.uid() = id);
create policy "Anyone can read active listings" on public.listings for select using (status = 'active' or auth.uid() = seller_id);
create policy "Users create their own listings" on public.listings for insert with check (auth.uid() = seller_id);
create policy "Users update their own listings" on public.listings for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
create policy "Users delete their own listings" on public.listings for delete using (auth.uid() = seller_id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, username) values (new.id, coalesce(new.raw_user_meta_data->>'username', 'gamer_' || substr(new.id::text, 1, 8))); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists listings_updated_at on public.listings;
create trigger listings_updated_at before update on public.listings for each row execute procedure public.set_updated_at();

insert into storage.buckets (id, name, public) values ('listing-images', 'listing-images', true) on conflict (id) do nothing;
create policy "Anyone can view listing images" on storage.objects for select using (bucket_id = 'listing-images');
create policy "Users upload listing images to their folder" on storage.objects for insert with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
