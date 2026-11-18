-- Privacy-first aggregate analytics. No event-level rows, user IDs, search terms,
-- IP addresses, device identifiers, or precise location data are stored.
-- Run after the existing Junubify migrations.

create table if not exists public.analytics_daily (
  event_date date not null default current_date,
  event_name text not null check (event_name in ('play', 'like', 'search', 'submission')),
  track_id uuid references public.tracks(id) on delete set null,
  region_code text check (region_code is null or region_code in ('south_sudan', 'east_africa', 'africa_other', 'europe', 'north_america', 'other')),
  event_count bigint not null default 1 check (event_count > 0),
  primary key (event_date, event_name, track_id, region_code)
);

-- PostgreSQL unique constraints treat NULLs as distinct. Use expression indexes
-- so daily aggregates upsert safely for searches and non-region events too.
create unique index if not exists analytics_daily_bucket_idx
  on public.analytics_daily (event_date, event_name, coalesce(track_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(region_code, ''));

alter table public.analytics_daily enable row level security;
revoke all on public.analytics_daily from anon, authenticated;

create or replace function public.record_analytics_event(
  p_event_name text,
  p_track_id uuid default null,
  p_region_code text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_event_name not in ('play', 'like', 'search') then
    raise exception 'Unsupported analytics event.' using errcode = '22023';
  end if;
  if p_region_code is not null and p_region_code not in ('south_sudan', 'east_africa', 'africa_other', 'europe', 'north_america', 'other') then
    raise exception 'Unsupported broad region.' using errcode = '22023';
  end if;
  if p_event_name in ('play', 'like') then
    if p_track_id is null or not exists (
      select 1 from public.tracks where id = p_track_id and status = 'published'
    ) then
      raise exception 'Published track not found.' using errcode = '22023';
    end if;
  elsif p_track_id is not null then
    raise exception 'Search analytics must not contain a track or search term.' using errcode = '22023';
  end if;

  insert into public.analytics_daily (event_date, event_name, track_id, region_code, event_count)
  values (current_date, p_event_name, p_track_id, p_region_code, 1)
  on conflict (event_date, event_name, coalesce(track_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(region_code, ''))
  do update set event_count = public.analytics_daily.event_count + 1;
end;
$$;

revoke all on function public.record_analytics_event(text, uuid, text) from public;
grant execute on function public.record_analytics_event(text, uuid, text) to anon, authenticated;

create or replace function public.record_track_submission_analytics()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.analytics_daily (event_date, event_name, track_id, region_code, event_count)
  values (current_date, 'submission', new.id, null, 1)
  on conflict (event_date, event_name, coalesce(track_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(region_code, ''))
  do update set event_count = public.analytics_daily.event_count + 1;
  return new;
end;
$$;

drop trigger if exists record_track_submission_analytics on public.tracks;
create trigger record_track_submission_analytics
  after insert on public.tracks
  for each row execute function public.record_track_submission_analytics();

create or replace function public.get_analytics_dashboard(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin boolean;
  v_days integer := greatest(7, least(coalesce(p_days, 30), 90));
  v_daily jsonb;
  v_totals jsonb;
  v_top_tracks jsonb;
  v_regions jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in to view analytics.' using errcode = '42501';
  end if;
  v_admin := (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';

  select coalesce(jsonb_agg(jsonb_build_object('date', bucket_date, 'event', event_name, 'count', event_count) order by bucket_date, event_name), '[]'::jsonb)
  into v_daily
  from (
    select a.event_date as bucket_date, a.event_name, sum(a.event_count)::bigint as event_count
    from public.analytics_daily a
    where a.event_date >= current_date - (v_days - 1)
      and (v_admin or (a.event_name <> 'search' and exists (
        select 1 from public.tracks t where t.id = a.track_id and t.artist_id = auth.uid()
      )))
    group by a.event_date, a.event_name
  ) d;

  select coalesce(jsonb_object_agg(event_name, event_count), '{}'::jsonb)
  into v_totals
  from (
    select a.event_name, sum(a.event_count)::bigint as event_count
    from public.analytics_daily a
    where a.event_date >= current_date - (v_days - 1)
      and (v_admin or (a.event_name <> 'search' and exists (
        select 1 from public.tracks t where t.id = a.track_id and t.artist_id = auth.uid()
      )))
    group by a.event_name
  ) totals;

  select coalesce(jsonb_agg(jsonb_build_object(
    'track_id', track_id, 'title', title, 'artist', artist_name, 'plays', plays, 'likes', likes
  ) order by plays desc, likes desc), '[]'::jsonb)
  into v_top_tracks
  from (
    select t.id as track_id, t.title, t.artist_name,
      coalesce(sum(a.event_count) filter (where a.event_name = 'play'), 0)::bigint as plays,
      coalesce(sum(a.event_count) filter (where a.event_name = 'like'), 0)::bigint as likes
    from public.tracks t
    left join public.analytics_daily a on a.track_id = t.id
      and a.event_date >= current_date - (v_days - 1)
      and a.event_name in ('play', 'like')
    where t.status = 'published' and (v_admin or t.artist_id = auth.uid())
    group by t.id, t.title, t.artist_name
    order by plays desc, likes desc
    limit 20
  ) top_rows;

  if v_admin then
    -- Regions are self-reported and returned only in broad buckets with at least
    -- five events, preventing small-cell disclosure. Artists never see regions.
    select coalesce(jsonb_agg(jsonb_build_object('region', region_code, 'plays', play_count) order by play_count desc), '[]'::jsonb)
    into v_regions
    from (
      select a.region_code, sum(a.event_count)::bigint as play_count
      from public.analytics_daily a
      where a.event_date >= current_date - (v_days - 1)
        and a.event_name = 'play' and a.region_code is not null
      group by a.region_code
      having sum(a.event_count) >= 5
    ) region_rows;
  else
    v_regions := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'days', v_days,
    'scope', case when v_admin then 'platform' else 'artist' end,
    'totals', v_totals,
    'daily', v_daily,
    'top_tracks', v_top_tracks,
    'regions', v_regions
  );
end;
$$;

revoke all on function public.get_analytics_dashboard(integer) from public;
grant execute on function public.get_analytics_dashboard(integer) to authenticated;
