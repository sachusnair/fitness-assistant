-- Fitness Assistant cloud database
-- Run this once in Supabase SQL Editor.

create table if not exists public.checkins (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight numeric(5,1),
  steps integer,
  calories integer,
  protein numeric(5,1),
  water numeric(4,1),
  sleep numeric(3,1),
  mood text,
  workout boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meal text not null,
  calories integer not null default 0,
  protein numeric(5,1) not null default 0,
  notes text,
  photo_data text,
  meal_time text,
  created_at timestamptz not null default now()
);

alter table public.checkins enable row level security;
alter table public.food_entries enable row level security;

drop policy if exists "Users can read own checkins" on public.checkins;
drop policy if exists "Users can insert own checkins" on public.checkins;
drop policy if exists "Users can update own checkins" on public.checkins;
drop policy if exists "Users can delete own checkins" on public.checkins;
create policy "Users can read own checkins" on public.checkins for select using (auth.uid() = user_id);
create policy "Users can insert own checkins" on public.checkins for insert with check (auth.uid() = user_id);
create policy "Users can update own checkins" on public.checkins for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own checkins" on public.checkins for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own food" on public.food_entries;
drop policy if exists "Users can insert own food" on public.food_entries;
drop policy if exists "Users can update own food" on public.food_entries;
drop policy if exists "Users can delete own food" on public.food_entries;
create policy "Users can read own food" on public.food_entries for select using (auth.uid() = user_id);
create policy "Users can insert own food" on public.food_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own food" on public.food_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own food" on public.food_entries for delete using (auth.uid() = user_id);

create index if not exists checkins_user_date_idx on public.checkins(user_id, date desc);
create index if not exists food_user_date_idx on public.food_entries(user_id, date desc);
