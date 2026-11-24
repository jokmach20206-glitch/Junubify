-- Keep the automatic metadata triage allowlist in sync with Artist Studio.
-- This does not auto-publish uploads; trusted moderators still approve every track.

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

  if lower(btrim(new.genre)) not in (
    'afrobeat',
    'traditional',
    'traditional & cultural',
    'hip-hop',
    'dancehall',
    'gospel',
    'gospel & choir',
    'oldies',
    'afro-pop'
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
