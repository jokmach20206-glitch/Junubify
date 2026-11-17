-- Run after 20261114000000_admin_track_review.sql.
-- New submissions are public immediately and remain visibly unverified until an admin checks them.

alter table public.tracks
  add column if not exists verified_at timestamptz;

-- Existing published tracks were already approved by the previous workflow.
update public.tracks
set verified_at = created_at
where status = 'published' and verified_at is null;

drop policy if exists "Artists can submit private tracks for review" on public.tracks;
create policy "Artists can submit tracks"
  on public.tracks for insert to authenticated
  with check (
    artist_id = auth.uid()
    and status in ('pending_review', 'published')
  );

create policy "Admins can read published tracks awaiting verification"
  on public.tracks for select to authenticated
  using (
    status = 'published'
    and verified_at is null
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "Admins can read rejected tracks"
  on public.tracks for select to authenticated
  using (
    status = 'rejected'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

grant update (status, verified_at) on public.tracks to authenticated;

create policy "Admins can verify published tracks"
  on public.tracks for update to authenticated
  using (
    status = 'published'
    and verified_at is null
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (
      (status = 'published' and verified_at is not null)
      or (status = 'rejected' and verified_at is null)
    )
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "Admins can preview tracks awaiting verification"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'junubify-audio'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and exists (
      select 1
      from public.tracks t
      where t.audio_path = name
        and (
          t.status = 'pending_review'
          or (t.status = 'published' and t.verified_at is null)
        )
    )
  );
