# Lootly setup

## Supabase

1. Create a Supabase project.
2. Open the SQL Editor and run `supabase/schema.sql`.
3. In Authentication → Providers, enable Email. For easy local testing you can disable email confirmation; otherwise confirm the email after sign-up.
4. Create `.env.local` from `.env.example`.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: your Supabase publishable/anon key

Only the public anon key is used in the browser. Never add a service-role key to frontend code.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, create an account, then use Sell to publish a listing. Browse reads active listings directly from Supabase. Dashboard only reads listings owned by the current user through the seller_id filter and RLS.
