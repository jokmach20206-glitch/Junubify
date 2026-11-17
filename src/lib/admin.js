import { supabase } from './supabase.js';

const TRACK_FIELDS = 'id,title,artist_name,genre,album,cover_url,audio_path,status,verified_at,created_at';
const AUDIO_BUCKET = 'junubify-audio';

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function mapVerificationTrack(track) {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist_name,
    genre: track.genre,
    album: track.album,
    cover: track.cover_url || null,
    audioPath: track.audio_path,
    status: track.status,
    verifiedAt: track.verified_at,
    createdAt: track.created_at,
  };
}

export async function fetchTracksAwaitingVerification() {
  const { data, error } = await requireSupabase()
    .from('tracks')
    .select(TRACK_FIELDS)
    .or('status.eq.pending_review,and(status.eq.published,verified_at.is.null)')
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  return data.map(mapVerificationTrack);
}

export async function createVerificationAudioUrl(audioPath) {
  const { data, error } = await requireSupabase()
    .storage.from(AUDIO_BUCKET)
    .createSignedUrl(audioPath, 5 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function verifyTrack(trackId, decision) {
  if (!['verify', 'reject'].includes(decision)) throw new Error('Invalid verification decision.');
  const updates = decision === 'verify'
    ? { status: 'published', verified_at: new Date().toISOString() }
    : { status: 'rejected', verified_at: null };
  const { data, error } = await requireSupabase()
    .from('tracks')
    .update(updates)
    .eq('id', trackId)
    .or('status.eq.pending_review,and(status.eq.published,verified_at.is.null)')
    .select('id')
    .single();
  if (error) throw error;
  return data;
}
