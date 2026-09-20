create extension if not exists pgcrypto;

alter table public.profiles add column if not exists wallet_address text;

create unique index if not exists profiles_wallet_address_unique on public.profiles(lower(wallet_address)) where wallet_address is not null;

create or replace function public.normalize_wallet_address(raw text)
returns text language plpgsql immutable as $$
begin
  if raw is null then return null; end if;
  return lower(trim(raw));
end; $$;

create or replace function public.validate_wallet_address(raw text)
returns boolean language plpgsql immutable as $$
begin
  return raw ~ '^0x[a-f0-9]{40}$';
end; $$;

create or replace function public.set_wallet_address()
returns trigger language plpgsql as $$
begin
  if new.wallet_address is not null then
    new.wallet_address = public.normalize_wallet_address(new.wallet_address);
    if not public.validate_wallet_address(new.wallet_address) then
      raise exception 'Invalid EVM wallet address.';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists profiles_wallet_address_check on public.profiles;
create trigger profiles_wallet_address_check before insert or update on public.profiles for each row execute procedure public.set_wallet_address();

alter table public.profiles enable row level security;

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id and (wallet_address is null or wallet_address ~ '^0x[a-f0-9]{40}$'));
