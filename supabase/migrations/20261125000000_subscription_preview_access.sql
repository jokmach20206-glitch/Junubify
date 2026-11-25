alter table public.tracks
  add column if not exists requires_subscription boolean not null default false,
  add column if not exists preview_audio_path text,
  add constraint tracks_subscription_requires_preview
    check (not requires_subscription or preview_audio_path is not null),
  add constraint tracks_preview_must_be_separate
    check (
      preview_audio_path is null
      or (
        preview_audio_path <> audio_path
        and split_part(preview_audio_path, '/', 1) = artist_id::text
      )
    );

drop policy if exists "Artists can read their own audio and published tracks can be streamed"
  on storage.objects;
drop policy if exists "Published audio can be signed for playback"
  on storage.objects;

create policy "Audio files can be signed for free tracks and previews"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'junubify-audio'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.tracks t
        where t.audio_path = name
          and t.status = 'published'
          and t.requires_subscription = false
      )
      or exists (
        select 1
        from public.tracks t
        where t.preview_audio_path = name
          and t.status = 'published'
      )
    )
  );
