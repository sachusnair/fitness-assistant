# Cloud database setup

The app is wired for a private Supabase PostgreSQL database with email/password authentication and Row Level Security.

## 1. Create the Supabase project

Create a project at https://supabase.com/dashboard.

## 2. Create the tables

Open **SQL Editor** and run the complete contents of `supabase-schema.sql` from this repository.

## 3. Get the browser-safe credentials

In Supabase open **Project Settings → API Keys** and copy:

- Project URL → `SUPABASE_URL`
- Publishable key (`sb_publishable_...`) → `SUPABASE_PUBLISHABLE_KEY`

Do **not** use or expose a `service_role`/secret key in the website. Supabase's publishable key is intended for browser apps when Row Level Security is configured.

## 4. Add GitHub Actions secrets

In GitHub open the repository's **Settings → Secrets and variables → Actions** and create these repository secrets:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

The deployment workflow injects these values at deploy time, so they are not committed to the repository.

## 5. Enable email/password auth

In Supabase open **Authentication → Providers → Email** and enable Email/password sign-in.

For a personal app, you can leave email confirmation enabled for better account security.

## 6. Deploy

Push to `main`, or manually run **Deploy Fitness Assistant** from GitHub Actions.

After deployment, the app will show **Cloud: Sign in**. Create your account, sign in, and the app will pull your cloud history. Saving a check-in, food entry, or workout will then sync it to the database.

## Important privacy note

Fitness data should not be stored in the public GitHub repository. The repository only contains the app code and database schema. Your actual records are stored in Supabase and protected by authentication plus Row Level Security.
