-- Run after 20261114000000_admin_track_review.sql.
-- Automated checks triage submissions only; every track remains private until
-- a trusted admin confirms the decision on /admin-confirm.html.

alter table public.tracks
  add column if not exists auto_review_status text not null default 'flagged'
    check (auto_review_status in ('passed', 'flagged')),
  add column if not exists auto_review_flags text[] not null default array['not_checked']::text[],
  add column if not exists auto_reviewed_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

create policy "Admins can read rejected track submissions"
  on public.tracks for select to authenticated
  using (
    status = 'rejected'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create or replace function public.auto_review_track_submission()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  flags text[] := array[]::text[];
begin
  if nullif(btrim(new.title), '') is null then
    flags := array_append(flags, 'blank_title');
  end if;

  if nullif(btrim(new.artist_name), '') is null then
    flags := array_append(flags, 'blank_artist');
  end if;

  if new.genre not in (
    'Afrobeat',
    'Dancehall',
    'Hip-Hop',
    'Traditional & Cultural',
    'Gospel & Choir',
    'Afro-Pop'
  ) then
    flags := array_append(flags, 'unsupported_genre');
  end if;

  if new.cover_url is not null and new.cover_url !~* '^https://[^[:space:]]+$' then
    flags := array_append(flags, 'cover_must_use_https');
  end if;

  if new.audio_path !~* '\.(mp3|wav|m4a|ogg|aac|flac)$' then
    flags := array_append(flags, 'unsupported_audio_extension');
  end if;

  if exists (
    select 1
    from public.tracks existing
    where existing.artist_id = new.artist_id
      and lower(btrim(existing.title)) = lower(btrim(new.title))
      and existing.status <> 'rejected'
  ) then
    flags := array_append(flags, 'possible_duplicate_title');
  end if;

  new.auto_review_flags := flags;
  new.auto_review_status := case when cardinality(flags) = 0 then 'passed' else 'flagged' end;
  new.auto_reviewed_at := now();
  return new;
end;
$$;

drop trigger if exists auto_review_track_submission on public.tracks;
create trigger auto_review_track_submission
  before insert on public.tracks
  for each row execute function public.auto_review_track_submission();

create or replace function public.record_track_review_confirmation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status = 'pending_review' and new.status in ('published', 'rejected') then
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists record_track_review_confirmation on public.tracks;
create trigger record_track_review_confirmation
  before update of status on public.tracks
  for each row execute function public.record_track_review_confirmation();
