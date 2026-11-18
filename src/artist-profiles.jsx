import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowUpRight, BadgeCheck, Disc3, ExternalLink, Globe2, Instagram, Music2, Pencil, Save, Search, Share2, ShieldCheck, X } from 'lucide-react';
import { supabase } from './lib/supabase.js';
import './artist-profiles.css';

const PROFILE_COLUMNS = 'artist_id,artist_name,bio,avatar_url,website_url,instagram_url,tiktok_url,youtube_url,facebook_url';
const SOCIALS = [
  ['website_url', 'Website', 'https://your-site.example'],
  ['instagram_url', 'Instagram', 'https://instagram.com/username'],
  ['tiktok_url', 'TikTok', 'https://tiktok.com/@username'],
  ['youtube_url', 'YouTube', 'https://youtube.com/@channel'],
  ['facebook_url', 'Facebook', 'https://facebook.com/page'],
];
const fallbackArt = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=600';

function safeExternalUrl(value) {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.href : '';
  } catch { return ''; }
}

function creditLines(credits = []) {
  return credits.map((credit) => `${credit.name || ''}${credit.role ? ` — ${credit.role}` : ''}`).join('\n');
}

function parseCredits(value) {
  return value.split('\n').map((line) => {
    const [name, ...role] = line.split(/\s+[—|]\s+/);
    return { name: name.trim(), role: role.join(' — ').trim() };
  }).filter((credit) => credit.name).slice(0, 30);
}

function ArtistProfiles() {
  const [open, setOpen] = useState(false);
  const [artists, setArtists] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [verifiedIds, setVerifiedIds] = useState(new Set());
  const [session, setSession] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [profileDraft, setProfileDraft] = useState(null);
  const [creditDrafts, setCreditDrafts] = useState({});

  const selectedArtist = artists.find((artist) => artist.artist_id === selectedId);
  const selectedProfile = profiles[selectedId] || {};
  const canEdit = Boolean(session?.user?.id && session.user.id === selectedId);
  const filteredArtists = useMemo(() => artists.filter((artist) => artist.artist_name.toLowerCase().includes(query.toLowerCase())), [artists, query]);
  const albumGroups = useMemo(() => {
    if (!selectedArtist) return [];
    const groups = new Map();
    selectedArtist.tracks.forEach((track) => {
      const albumName = (track.album || 'Singles').trim() || 'Singles';
      if (!groups.has(albumName)) groups.set(albumName, []);
      groups.get(albumName).push(track);
    });
    return [...groups.entries()].map(([name, tracks]) => ({ name, tracks }));
  }, [selectedArtist]);

  const loadArtists = async () => {
    if (!supabase) { setNotice('Connect Supabase to browse artist profiles.'); return; }
    setLoading(true);
    setNotice('');
    try {
      const { data: trackRows, error: tracksError } = await supabase.from('tracks')
        .select('id,artist_id,artist_name,title,genre,album,cover_url,plays,created_at,credits')
        .eq('status', 'published').order('created_at', { ascending: false }).limit(500);
      if (tracksError) throw tracksError;
      const rows = trackRows || [];
      const ids = [...new Set(rows.map((track) => track.artist_id))];
      const [profileResult, verifiedResult] = ids.length ? await Promise.all([
        supabase.from('artist_profiles').select(PROFILE_COLUMNS).in('artist_id', ids),
        supabase.from('artist_verifications').select('artist_id').eq('verified', true).in('artist_id', ids),
      ]) : [{ data: [], error: null }, { data: [], error: null }];
      if (profileResult.error) throw profileResult.error;
      if (verifiedResult.error) throw verifiedResult.error;
      const profileMap = Object.fromEntries((profileResult.data || []).map((profile) => [profile.artist_id, profile]));
      const verified = new Set((verifiedResult.data || []).map((profile) => profile.artist_id));
      const artistMap = new Map();
      rows.forEach((track) => {
        if (!artistMap.has(track.artist_id)) artistMap.set(track.artist_id, { artist_id: track.artist_id, artist_name: track.artist_name, tracks: [] });
        artistMap.get(track.artist_id).tracks.push(track);
      });
      const artistList = [...artistMap.values()].map((artist) => ({
        ...artist,
        artist_name: profileMap[artist.artist_id]?.artist_name || artist.artist_name,
        tracks: artist.tracks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      })).sort((a, b) => a.artist_name.localeCompare(b.artist_name));
      setProfiles(profileMap);
      setVerifiedIds(verified);
      setArtists(artistList);
      const sharedId = new URLSearchParams(window.location.search).get('artist');
      if (sharedId && artistList.some((artist) => artist.artist_id === sharedId)) setSelectedId(sharedId);
    } catch (error) {
      setNotice(error.message || 'Could not load artist profiles. Apply the artist profile Supabase migration, then try again.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data?.session ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (open) loadArtists(); }, [open]);
  useEffect(() => {
    const profile = selectedProfile;
    setProfileDraft({ artist_name: profile.artist_name || selectedArtist?.artist_name || '', bio: profile.bio || '', avatar_url: profile.avatar_url || '', website_url: profile.website_url || '', instagram_url: profile.instagram_url || '', tiktok_url: profile.tiktok_url || '', youtube_url: profile.youtube_url || '', facebook_url: profile.facebook_url || '' });
    setCreditDrafts(Object.fromEntries((selectedArtist?.tracks || []).map((track) => [track.id, creditLines(track.credits || [])])));
  }, [selectedId, selectedArtist?.artist_name]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('artist-profile-open');
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.classList.remove('artist-profile-open'); };
  }, [open]);

  const updateUrl = (artistId) => {
    const url = new URL(window.location.href);
    if (artistId) url.searchParams.set('artist', artistId);
    else url.searchParams.delete('artist');
    window.history.replaceState({}, '', url);
  };
  const close = () => { setOpen(false); setSelectedId(''); updateUrl(''); };
  const selectArtist = (artistId) => { setSelectedId(artistId); setNotice(''); updateUrl(artistId); };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!canEdit || !profileDraft) return;
    const socialValues = Object.fromEntries(SOCIALS.map(([key]) => [key, profileDraft[key].trim() || null]));
    for (const [key, label] of SOCIALS) {
      if (socialValues[key] && !safeExternalUrl(socialValues[key])) { setNotice(`${label} link must be a valid HTTPS URL.`); return; }
    }
    const name = profileDraft.artist_name.trim();
    if (!name || name.length > 100) { setNotice('Enter an artist name between 1 and 100 characters.'); return; }
    setSaving(true); setNotice('');
    try {
      const { data, error } = await supabase.from('artist_profiles').upsert({ artist_id: selectedId, artist_name: name, bio: profileDraft.bio.trim() || null, avatar_url: profileDraft.avatar_url.trim() || null, ...socialValues }, { onConflict: 'artist_id' }).select(PROFILE_COLUMNS).single();
      if (error) throw error;
      setProfiles((current) => ({ ...current, [selectedId]: data }));
      setArtists((current) => current.map((artist) => artist.artist_id === selectedId ? { ...artist, artist_name: data.artist_name } : artist));
      setNotice('Artist profile saved.');
    } catch (error) { setNotice(error.message || 'Could not save your artist profile.'); }
    finally { setSaving(false); }
  };

  const saveCredits = async (track) => {
    if (!canEdit) return;
    const credits = parseCredits(creditDrafts[track.id] || '');
    setSaving(true); setNotice('');
    try {
      const { error } = await supabase.from('tracks').update({ credits }).eq('id', track.id).eq('artist_id', selectedId).eq('status', 'published');
      if (error) throw error;
      setArtists((current) => current.map((artist) => artist.artist_id === selectedId ? { ...artist, tracks: artist.tracks.map((item) => item.id === track.id ? { ...item, credits } : item) } : artist));
      setNotice(`Credits saved for “${track.title}”.`);
    } catch (error) { setNotice(error.message || 'Could not save track credits. Apply the artist profile migration if the credits field is missing.'); }
    finally { setSaving(false); }
  };

  const shareProfile = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('artist', selectedId);
    try {
      if (navigator.share) await navigator.share({ title: `${selectedArtist.artist_name} on Junubify`, text: `Explore ${selectedArtist.artist_name}'s music`, url: url.href });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url.href); setNotice('Artist profile link copied.'); }
      else setNotice(url.href);
    } catch { /* Native share sheet dismissed. */ }
  };

  return <>
    <button className="artist-profile-launcher" onClick={() => { setOpen(true); setSelectedId(new URLSearchParams(window.location.search).get('artist') || ''); }} aria-label="Browse artist profiles"><Music2 size={17}/><span>Artists</span></button>
    {open && <div className="artist-profile-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="artist-profile-dialog" role="dialog" aria-modal="true" aria-label="Artist profiles">
        <header className="artist-profile-header">
          {selectedId ? <button className="artist-icon-button" onClick={() => selectArtist('')} aria-label="Back to artists"><ArrowLeft size={19}/></button> : <span className="artist-header-mark"><Music2 size={18}/></span>}
          <div><span className="artist-eyebrow">JUNUBIFY ARTISTS</span><strong>{selectedArtist?.artist_name || 'Artist profiles'}</strong></div>
          {selectedArtist && <button className="artist-icon-button" onClick={shareProfile} aria-label="Share artist profile"><Share2 size={18}/></button>}
          <button className="artist-icon-button" onClick={close} aria-label="Close profiles"><X size={19}/></button>
        </header>
        {notice && <p className="artist-profile-notice" role="status">{notice}</p>}
        {loading ? <div className="artist-profile-state">Loading artist profiles…</div> : selectedArtist ? <div className="artist-profile-scroll">
          <section className="artist-profile-hero">
            <img src={selectedProfile.avatar_url || selectedArtist.tracks[0]?.cover_url || fallbackArt} alt={`${selectedArtist.artist_name} profile`}/>
            <div className="artist-profile-heading"><div className="artist-profile-name">{selectedArtist.artist_name}{verifiedIds.has(selectedId) && <span className="artist-verified" title="Verified artist"><BadgeCheck size={19}/><span>Verified</span></span>}</div><p>{selectedArtist.tracks.length} published {selectedArtist.tracks.length === 1 ? 'track' : 'tracks'} · {selectedArtist.tracks.reduce((sum, track) => sum + Number(track.plays || 0), 0).toLocaleString()} plays</p></div>
          </section>
          {selectedProfile.bio && <section className="artist-profile-section"><span className="artist-eyebrow">ABOUT</span><p className="artist-bio">{selectedProfile.bio}</p></section>}
          {SOCIALS.some(([key]) => safeExternalUrl(selectedProfile[key])) && <section className="artist-profile-section"><span className="artist-eyebrow">FOLLOW THE ARTIST</span><div className="artist-social-links">{SOCIALS.map(([key, label]) => safeExternalUrl(selectedProfile[key]) && <a key={key} href={safeExternalUrl(selectedProfile[key])} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/>{label}</a>)}</div></section>}
          {canEdit && <details className="artist-edit-panel"><summary><Pencil size={15}/> Edit your public profile</summary><form onSubmit={saveProfile} className="artist-profile-form"><label>Artist or group name<input maxLength={100} required value={profileDraft?.artist_name || ''} onChange={(event) => setProfileDraft((current) => ({ ...current, artist_name: event.target.value }))}/></label><label>Profile image URL<input type="url" placeholder="https://…" value={profileDraft?.avatar_url || ''} onChange={(event) => setProfileDraft((current) => ({ ...current, avatar_url: event.target.value }))}/></label><label>Bio<textarea maxLength={1200} rows={4} placeholder="Tell listeners about your sound and story…" value={profileDraft?.bio || ''} onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))}/><small>{(profileDraft?.bio || '').length}/1200</small></label><div className="artist-social-form">{SOCIALS.map(([key, label, placeholder]) => <label key={key}>{label}<input type="url" placeholder={placeholder} value={profileDraft?.[key] || ''} onChange={(event) => setProfileDraft((current) => ({ ...current, [key]: event.target.value }))}/></label>)}</div><button className="artist-save-button" type="submit" disabled={saving}><Save size={15}/>{saving ? 'Saving…' : 'Save profile'}</button></form></details>}
          <section className="artist-profile-section discography-section"><div className="artist-discography-heading"><div><span className="artist-eyebrow">THE MUSIC</span><h2>Discography</h2></div><span>{selectedArtist.tracks.length} tracks</span></div>
            {albumGroups.map((album) => <section className="artist-album" key={album.name}><div className="artist-album-heading"><Disc3 size={17}/><div><h3>{album.name}</h3><span>{album.tracks.length} {album.tracks.length === 1 ? 'track' : 'tracks'}</span></div></div><div className="artist-discography">{album.tracks.map((track, index) => <article className="artist-discography-track" key={track.id}><span className="artist-track-index">{String(index + 1).padStart(2, '0')}</span><img src={track.cover_url || fallbackArt} alt=""/><div className="artist-track-info"><strong>{track.title}</strong><span>{track.genre} · {Number(track.plays || 0).toLocaleString()} plays</span></div><ArrowUpRight size={15} className="artist-track-arrow"/></article>)}</div></section>)}
          </section>
          <section className="artist-profile-section artist-credits-section"><span className="artist-eyebrow">SONG CREDITS</span>{selectedArtist.tracks.map((track) => <article className="artist-credit-track" key={track.id}><h3>{track.title}</h3>{track.credits?.length ? <ul>{track.credits.map((credit, index) => <li key={`${credit.name}-${index}`}><span>{credit.name}</span><small>{credit.role || 'Contributor'}</small></li>)}</ul> : <p className="artist-no-credits">No credits added yet.</p>}{canEdit && <details className="artist-credits-edit"><summary><Pencil size={13}/> Edit credits</summary><label className="sr-only" htmlFor={`credits-${track.id}`}>Credits, one contributor per line, name — role</label><textarea id={`credits-${track.id}`} rows={3} maxLength={3000} placeholder={'Contributor name — Role\nAnother contributor — Producer'} value={creditDrafts[track.id] || ''} onChange={(event) => setCreditDrafts((current) => ({ ...current, [track.id]: event.target.value }))}/><small>One person per line: Name — Role (up to 30 contributors)</small><button className="artist-save-button compact" onClick={() => saveCredits(track)} disabled={saving}><Save size={14}/> Save credits</button></details>}</article>)}</section>
          <p className="artist-profile-footnote"><ShieldCheck size={14}/> Verification badges are granted by Junubify moderators.</p>
        </div> : <div className="artist-profile-scroll"><div className="artist-search"><Search size={17}/><input aria-label="Search artists" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search artists"/></div>{filteredArtists.length ? <div className="artist-directory">{filteredArtists.map((artist) => <button className="artist-directory-row" key={artist.artist_id} onClick={() => selectArtist(artist.artist_id)}><img src={profiles[artist.artist_id]?.avatar_url || artist.tracks[0]?.cover_url || fallbackArt} alt=""/><span><strong>{artist.artist_name}{verifiedIds.has(artist.artist_id) && <BadgeCheck size={15} className="directory-verified"/>}</strong><small>{artist.tracks.length} published {artist.tracks.length === 1 ? 'track' : 'tracks'}</small></span><ArrowUpRight size={16}/></button>)}</div> : <div className="artist-profile-state">{query ? 'No artists match your search.' : 'No published artist releases yet.'}</div>}</div>}
      </section>
    </div>}
  </>;
}

const host = document.createElement('div');
host.id = 'junubify-artist-profiles';
document.body.appendChild(host);
createRoot(host).render(<ArtistProfiles/>);
