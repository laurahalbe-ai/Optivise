-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Clients table
create table if not exists public.clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  industry text,
  audience text,
  usp text,
  goal text,
  color_primary text default '#7B6EF6',
  color_secondary text default '#34D399',
  color_accent text default '#FBBF24',
  font text,
  tones text[] default '{}',
  donts text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.clients enable row level security;

-- Policies: users can only see/edit their own clients
create policy "Users can view own clients"
  on public.clients for select
  using (auth.uid() = user_id);

create policy "Users can insert own clients"
  on public.clients for insert
  with check (auth.uid() = user_id);

create policy "Users can update own clients"
  on public.clients for update
  using (auth.uid() = user_id);

create policy "Users can delete own clients"
  on public.clients for delete
  using (auth.uid() = user_id);
