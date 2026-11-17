-- SIRAYAT CMS DATABASE SCHEMA (Supabase / PostgreSQL)
-- Run this in the Supabase SQL Editor using the project owner account.
-- Roles: admin, editor_in_chief, section_editor, writer, photojournalist

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Editorial Staff',
  role text not null default 'writer'
    check (role in ('admin','editor_in_chief','section_editor','writer','photojournalist')),
  section text,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  title text not null,
  title_fil text,
  category text not null check (category in ('News','Editorial','Feature','Sports','Science & Technology','Literary','Photojournalism')),
  excerpt text not null,
  body text not null,
  body_fil text,
  status text not null default 'draft' check (status in ('draft','for_review','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_staff_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.current_staff_section()
returns text language sql stable security definer set search_path = public
as $$ select section from public.profiles where id = auth.uid() $$;

alter table public.profiles enable row level security;
alter table public.articles enable row level security;

-- Staff can read their own profile; admins can read all profiles.
drop policy if exists "profile self or admin read" on public.profiles;
create policy "profile self or admin read" on public.profiles for select to authenticated
using (id = auth.uid() or public.current_staff_role() = 'admin');

-- Only admins can assign or change roles. Do not enable public sign-up in the app.
drop policy if exists "admin manages profiles" on public.profiles;
create policy "admin manages profiles" on public.profiles for all to authenticated
using (public.current_staff_role() = 'admin')
with check (public.current_staff_role() = 'admin');

-- Anyone can read published stories; staff can read their own drafts and newsroom submissions.
drop policy if exists "public reads published" on public.articles;
create policy "public reads published" on public.articles for select to anon, authenticated
using (
  status = 'published'
  or author_id = auth.uid()
  or public.current_staff_role() in ('admin','editor_in_chief')
  or (public.current_staff_role() = 'section_editor' and category = public.current_staff_section())
);

-- Writers and photojournalists can create their own draft/review submissions only.
drop policy if exists "staff creates own submissions" on public.articles;
create policy "staff creates own submissions" on public.articles for insert to authenticated
with check (
  author_id = auth.uid()
  and status in ('draft','for_review')
  and public.current_staff_role() in ('writer','photojournalist','section_editor','editor_in_chief','admin')
);

-- Authors may edit their own unpublished work. Editors/admins can edit newsroom work.
drop policy if exists "authors and editors update" on public.articles;
create policy "authors and editors update" on public.articles for update to authenticated
using (
  (author_id = auth.uid() and status <> 'published')
  or public.current_staff_role() in ('admin','editor_in_chief')
  or (public.current_staff_role() = 'section_editor' and category = public.current_staff_section())
)
with check (
  (author_id = auth.uid() and status in ('draft','for_review'))
  or public.current_staff_role() in ('admin','editor_in_chief')
  or (public.current_staff_role() = 'section_editor' and category = public.current_staff_section())
);

-- Authors may delete their own unpublished work; editors/admins can remove content.
drop policy if exists "authors and editors delete" on public.articles;
create policy "authors and editors delete" on public.articles for delete to authenticated
using (
  (author_id = auth.uid() and status <> 'published')
  or public.current_staff_role() in ('admin','editor_in_chief')
  or (public.current_staff_role() = 'section_editor' and category = public.current_staff_section())
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists articles_updated_at on public.articles;
create trigger articles_updated_at before update on public.articles
for each row execute function public.set_updated_at();

-- IMPORTANT: After the first staff account is created through Supabase Auth,
-- add its profile manually in the SQL Editor and assign the admin role:
-- insert into public.profiles (id, display_name, role)
-- select id, 'Publication Administrator', 'admin'
-- from auth.users where email = 'YOUR_ADMIN_EMAIL';
--
-- Create other users in Supabase Authentication, then insert their profiles
-- with the correct role and section. Never expose the service_role key.
