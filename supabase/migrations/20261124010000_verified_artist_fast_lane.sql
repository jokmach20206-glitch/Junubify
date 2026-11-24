-- Verified artists may publish clean submissions automatically.
-- Unverified or flagged tracks stay private for trusted moderator review.

create or replace function public.auto_review_track_submission()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  flags text[] := array[]::text[];
begin
  new.status := 'pending_review';

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

  if cardinality(flags) = 0 and exists (
    select 1
    from public.artist_verifications verification
    where verification.artist_id = new.artist_id
      and verification.verified
  ) then
    new.status := 'published';
  end if;

  return new;
end;
$$;

drop policy if exists "Artists can submit private tracks for review" on public.tracks;
create policy "Artists can submit pending or verified fast-lane tracks"
  on public.tracks for insert to authenticated
  with check (
    artist_id = auth.uid()
    and (
      status = 'pending_review'
      or (
        status = 'published'
        and auto_review_status = 'passed'
        and exists (
          select 1
          from public.artist_verifications verification
          where verification.artist_id = auth.uid()
            and verification.verified
        )
      )
    )
  );
