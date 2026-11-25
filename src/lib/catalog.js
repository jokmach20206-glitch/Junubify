import { supabase } from './supabase.js';

const AUDIO_BUCKET = 'junubify-audio';
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac']);
const CONTENT_TYPE_BY_EXTENSION = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
  flac: 'audio/flac',
};

function throwIfError(result) {
  if (result.error) throw result.error;
  return result.data;
}

function mapTrack(track) {
  const audioPath = typeof track.audio_path === 'string' ? track.audio_path : '';
  const previewAudioPath = typeof track.preview_audio_path === 'string' ? track.preview_audio_path : '';
  return {
    id: track.id,
    title: track.title,
    artist: track.artist_name,
    genre: track.genre,
    album: track.album,
    plays: track.plays ?? 0,
    cover: track.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=500',
    audioPath,
    previewAudioPath,
    requiresSubscription: track.requires_subscription === true,
    status: track.status,
    fileName: audioPath ? audioPath.split('/').pop() : '',
  };
}

export async function fetchPublishedTracks() {
  const data = throwIfError(await supabase
    .from('tracks')
    .select('id,title,artist_name,genre,album,cover_url,audio_path,preview_audio_path,requires_subscription,status,plays,created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(100));
  return data.map(mapTrack);
}

export async function fetchArtistTracks(artistId) {
  const data = throwIfError(await supabase
    .from('tracks')
    .select('id,title,artist_name,genre,album,cover_url,audio_path,preview_audio_path,requires_subscription,status,plays,created_at')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })
    .limit(100));
  return data.map(mapTrack);
}

export async function createTrackAudioUrl(audioPath) {
  const data = throwIfError(await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(audioPath, 60 * 60));
  return data.signedUrl;
}

export async function submitTrack({ file, previewFile, form, artistId }) {
  if (!supabase) throw new Error('Connect Supabase before submitting audio.');
  if (!artistId) throw new Error('Sign in before submitting a track.');
  if (!file || file.size > MAX_AUDIO_BYTES) throw new Error('Choose an audio file no larger than 50 MB.');

  const extensionFor = (audioFile) => audioFile.name.split('.').pop()?.toLowerCase();
  const extension = extensionFor(file);
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error('Choose an MP3, WAV, M4A, OGG, AAC, or FLAC audio file.');
  }
  const requiresSubscription = form.requiresSubscription === true;
  if (requiresSubscription && !previewFile) throw new Error('Choose a preview clip for a subscription-only release.');
  if (previewFile && previewFile.size > MAX_AUDIO_BYTES) throw new Error('Preview audio must be 50 MB or smaller.');
  const previewExtension = previewFile && extensionFor(previewFile);
  if (previewFile && (!previewExtension || !ALLOWED_EXTENSIONS.has(previewExtension))) {
    throw new Error('Choose an MP3, WAV, M4A, OGG, AAC, or FLAC preview clip.');
  }

  const audioPath = `${artistId}/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from(AUDIO_BUCKET).upload(audioPath, file, {
    contentType: CONTENT_TYPE_BY_EXTENSION[extension],
    upsert: false,
  });
  if (upload.error) throw upload.error;

  let previewAudioPath = null;
  if (previewFile && previewExtension) {
    previewAudioPath = `${artistId}/${crypto.randomUUID()}-preview.${previewExtension}`;
    const previewUpload = await supabase.storage.from(AUDIO_BUCKET).upload(previewAudioPath, previewFile, {
      contentType: CONTENT_TYPE_BY_EXTENSION[previewExtension],
      upsert: false,
    });
    if (previewUpload.error) {
      const cleanup = await supabase.storage.from(AUDIO_BUCKET).remove([audioPath]);
      if (cleanup.error) throw new Error(`Preview upload failed (${previewUpload.error.message}); full audio cleanup failed (${cleanup.error.message}).`);
      throw previewUpload.error;
    }
  }

  const insert = await supabase.from('tracks').insert({
    artist_id: artistId,
    artist_name: form.artist.trim(),
    title: form.title.trim(),
    genre: form.genre,
    album: form.album.trim() || 'Single',
    cover_url: form.cover.trim() || null,
    audio_path: audioPath,
    preview_audio_path: previewAudioPath,
    requires_subscription: requiresSubscription,
    status: 'pending_review',
    rights_confirmed_at: new Date().toISOString(),
  }).select('id,title,artist_name,genre,album,cover_url,audio_path,preview_audio_path,requires_subscription,status,plays,created_at').single();

  if (insert.error) {
    // The storage delete policy permits removing only this user's unreferenced uploads.
    const cleanup = await supabase.storage.from(AUDIO_BUCKET).remove([audioPath, ...(previewAudioPath ? [previewAudioPath] : [])]);
    if (cleanup.error) throw new Error(`Track submission failed (${insert.error.message}); uploaded audio cleanup failed (${cleanup.error.message}).`);
    throw insert.error;
  }

  return mapTrack(insert.data);
}
