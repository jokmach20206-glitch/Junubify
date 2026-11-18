-- Artist profiles can be edited only by their owner. Verified status remains exclusively
-- controlled by the existing admin-only artist_verifications workflow.

create table if not exists public.artist_profiles (
  artist_id uuid primary key references auth.users(id) on delete cascade,
  artist_name text not null check (char_length(btrim(artist_name)) between 1 and 100),
  bio text check (bio is null or char_length(bio) <= 1200),
  avatar_url text check (avatar_url is null or avatar_url ~* '^https://[^[:space:]]+$'),
  website_url text check (website_url is null or website_url ~* '^https://[^[:space:]]+$'),
  instagram_url text check (instagram_url is null or instagram_url ~* '^https://[^[:space:]]+$'),
  tiktok_url text check (tiktok_url is null or tiktok_url ~* '^https://[^[:space:]]+$'),
  youtube_url text check (youtube_url is null or youtube_url ~* '^https://[^[:space:]]+$'),
  facebook_url text check (facebook_url is null or facebook_url ~* '^https://[^[:space:]]+$'),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.artist_profiles enable row level security;
revoke all on public.artist_profiles from anon, authenticated;
grant select on public.artist_profiles to anon, authenticated;
grant insert (artist_id, artist_name, bio, avatar_url, website_url, instagram_url, tiktok_url, youtube_url, facebook_url) on public.artist_profiles to authenticated;
grant update (artist_name, bio, avatar_url, website_url, instagram_url, tiktok_url, youtube_url, facebook_url) on public.artist_profiles to authenticated;

create policy "Public artist profiles are readable"
  on public.artist_profiles for select to anon, authenticated using (true);
create policy "Artists can create their own profile"
  on public.artist_profiles for insert to authenticated
  with check (artist_id = auth.uid());
create policy "Artists can update their own profile"
  on public.artist_profiles for update to authenticated
  using (artist_id = auth.uid())
  with check (artist_id = auth.uid());

create or replace function public.touch_artist_profile_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_artist_profile_updated_at on public.artist_profiles;
create trigger touch_artist_profile_updated_at
  before update on public.artist_profiles
  for each row execute function public.touch_artist_profile_updated_at();

alter table public.tracks
  add column if not exists credits jsonb not null default '[]'::jsonb
    check (jsonb_typeof(credits) = 'array' and jsonb_array_length(credits) <= 30);

grant update (credits) on public.tracks to authenticated;
create policy "Artists can update credits on their published tracks"
  on public.tracks for update to authenticated
  using (artist_id = auth.uid() and status = 'published')
  with check (artist_id = auth.uid() and status = 'published');
