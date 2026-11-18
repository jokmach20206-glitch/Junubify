-- Run after 20261109000000_platform_backend.sql, 20261114000000_admin_track_review.sql,
-- and 20261117000000_automated_review_checks.sql in the Supabase SQL editor.
-- Moderation is restricted to accounts with the trusted app_metadata.role=admin claim.

alter table public.tracks
  add column if not exists moderation_notes text
    check (moderation_notes is null or char_length(moderation_notes) <= 2000);

grant update (status, moderation_notes) on public.tracks to authenticated;

create table if not exists public.artist_verifications (
  artist_id uuid primary key references auth.users(id) on delete cascade,
  artist_name text not null check (char_length(artist_name) between 1 and 100),
  verified boolean not null default false,
  moderation_note text check (moderation_note is null or char_length(moderation_note) <= 1000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.artist_verifications enable row level security;
revoke all on public.artist_verifications from anon, authenticated;
grant select on public.artist_verifications to anon, authenticated;
grant insert (artist_id, artist_name, verified, moderation_note) on public.artist_verifications to authenticated;
grant update (artist_id, artist_name, verified, moderation_note) on public.artist_verifications to authenticated;

create policy "Admins can read artist verification records"
  on public.artist_verifications for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Verified artist profiles are public"
  on public.artist_verifications for select to anon, authenticated
  using (verified = true);

create policy "Admins can create artist verification records"
  on public.artist_verifications for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update artist verification records"
  on public.artist_verifications for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.record_artist_verification_review()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.reviewed_by := auth.uid();
  new.reviewed_at := now();
  return new;
end;
$$;

drop trigger if exists record_artist_verification_review on public.artist_verifications;
create trigger record_artist_verification_review
  before insert or update on public.artist_verifications
  for each row execute function public.record_artist_verification_review();
