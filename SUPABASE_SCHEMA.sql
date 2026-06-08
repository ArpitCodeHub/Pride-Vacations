-- ============================================================
-- PRIDE VACATIONS — Supabase Schema & RLS Setup
-- Paste this entire file into:
--   Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================
-- TABLES
-- ============================

create table if not exists public.experiences (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    title text not null,
    subtitle text,
    hero_tagline text,
    atmosphere text not null default 'mountain',         -- mountain | beach | heritage | forest
    location_name text,
    country text,
    region text,
    hero_image_url text,
    hero_video_url text,
    gallery jsonb default '[]'::jsonb,
    amenities jsonb default '[]'::jsonb,
    duration_nights integer,
    starting_price numeric(12,2),
    currency_code text default 'INR',
    themes text[],
    story_overview text,
    story_chapters jsonb default '[]'::jsonb,            -- [{number, title, body, image_url}]
    property_name text,
    is_featured boolean default false,
    sort_order integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.travel_stories (
    id uuid primary key default gen_random_uuid(),
    experience_id uuid references public.experiences(id) on delete set null,
    slug text not null unique,
    title text not null,
    excerpt text,
    hero_image_url text,
    body text,
    author_name text,
    read_minutes integer default 5,
    created_at timestamptz default now()
);

create table if not exists public.leads_inquiries (
    id uuid primary key default gen_random_uuid(),
    experience_id uuid references public.experiences(id) on delete set null,
    full_name text not null,
    email text not null,
    phone text,
    travel_companions text,
    preferred_destinations text[],
    budget_range text,
    preferred_travel_start date,
    preferred_travel_end date,
    occasion text,
    message text,
    status text default 'new',
    admin_notes text,
    created_at timestamptz default now()
);

create table if not exists public.admin_users (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique,
    email text not null unique,
    is_superadmin boolean default true,
    created_at timestamptz default now()
);

-- ============================
-- RLS
-- ============================
alter table public.experiences enable row level security;
alter table public.travel_stories enable row level security;
alter table public.leads_inquiries enable row level security;
alter table public.admin_users enable row level security;

-- Drop existing policies if rerunning
drop policy if exists "public_read_experiences" on public.experiences;
drop policy if exists "public_read_stories" on public.travel_stories;
drop policy if exists "public_insert_leads" on public.leads_inquiries;
drop policy if exists "admin_read_admins" on public.admin_users;

create policy "public_read_experiences"
on public.experiences for select
to anon, authenticated
using ( true );

create policy "public_read_stories"
on public.travel_stories for select
to anon, authenticated
using ( true );

create policy "public_insert_leads"
on public.leads_inquiries for insert
to anon, authenticated
with check ( true );

create policy "admin_read_admins"
on public.admin_users for select
to authenticated
using ( user_id = auth.uid() );

-- Note: All admin write/read operations go through the FastAPI backend
-- using the service_role key, which bypasses RLS. Backend enforces auth
-- via Supabase Auth token validation.
