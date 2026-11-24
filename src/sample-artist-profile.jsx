import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, BadgeCheck, CalendarDays, Disc3, ExternalLink, Instagram, Mail, MapPin, Music2, Play, Share2, X, Youtube } from 'lucide-react';
import yungBwoyTrack from '../Yung_Bwoy__They_Don’t_want__official_audio___ft_Dogg_Hustle(256k).mp3';
import doggHustleTrack from '../Dogg_Hustle_Faded_official_lyrics_(256k)(1).mp3';
import './sample-artist-profile.css';

const songs = [
  {
    title: 'They Don’t Want',
    artist: 'Yung Bwoy',
    feature: 'feat. Dogg Hustle',
    type: 'Single · Sample release',
    genre: 'Hip-Hop / Afrobeat',
    audio: yungBwoyTrack,
    art: 'they-dont-want',
    alt: 'Illustrative They Don’t Want single cover, designed for the Junubify demo',
    lyric: 'They doubt the road, still we rise with the sun.\nOne voice, one dream—till the work is done.',
    credit: 'Yung Bwoy · lead artist | Dogg Hustle · featured artist',
  },
  {
    title: 'Faded',
    artist: 'Dogg Hustle',
    feature: 'Collaborator spotlight',
    type: 'Single · Sample release',
    genre: 'Hip-Hop',
    audio: doggHustleTrack,
    art: 'faded',
    alt: 'Illustrative Faded single cover, designed for the Junubify demo',
    lyric: 'City lights blur as the night rolls by.\nI find my way when I look inside.',
    credit: 'Dogg Hustle · lead artist',
  },
];

function SampleArtwork({ song }) {
  return <div className={`sample-artwork ${song.art}`} role="img" aria-label={song.alt}>
    <span className="sample-artwork-kicker">JUNUBIFY · SAMPLE ART</span>
    <strong>{song.title}</strong>
    <span>{song.artist}{song.art === 'they-dont-want' ? ' × DOGG HUSTLE' : ''}</span>
    <i aria-hidden="true">♫</i>
  </div>;
}

function SampleArtistProfile() {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('sample-profile-open');
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('sample-profile-open');
    };
  }, [open]);

  const shareProfile = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: 'Yung Bwoy · Junubify', text: 'Explore this sample artist profile on Junubify.', url });
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setNotice('Profile link copied.');
      } else setNotice(url);
    } catch { /* The share sheet was dismissed. */ }
  };

  return <>
    <button className="sample-profile-launcher" onClick={() => setOpen(true)} aria-label="Open Yung Bwoy sample artist profile">
      <Music2 size={16} /><span>Artist profile</span>
    </button>
    {open && <div className="sample-profile-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="sample-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="sample-profile-name">
        <header className="sample-profile-topbar">
          <div><span className="sample-profile-label">JUNUBIFY · ARTIST SPOTLIGHT</span><strong>Sample artist profile</strong></div>
          <button type="button" className="sample-profile-icon-button" onClick={() => setOpen(false)} aria-label="Close artist profile"><X size={19}/></button>
        </header>
        {notice && <p className="sample-profile-notice" role="status">{notice}</p>}
        <div className="sample-profile-scroll">
          <section className="sample-profile-hero">
            <div className="sample-artist-avatar" aria-hidden="true">YB<span>♪</span></div>
            <div className="sample-artist-intro">
              <span className="sample-profile-label"><BadgeCheck size={14}/> DEMO PROFILE · NOT VERIFIED</span>
              <h1 id="sample-profile-name">Yung Bwoy</h1>
              <p><MapPin size={14}/> Juba, South Sudan <span>·</span> Hip-Hop / Afrobeat</p>
              <div className="sample-profile-actions"><a href="#sample-discography"><Play size={15} fill="currentColor"/> Explore music</a><button type="button" onClick={shareProfile}><Share2 size={15}/> Share</button></div>
            </div>
          </section>

          <section className="sample-profile-section">
            <span className="sample-profile-label">ABOUT THE ARTIST</span>
            <p className="sample-profile-bio">Yung Bwoy is presented here as an emerging South Sudanese hip-hop artist with a sound rooted in contemporary African rhythms and collaboration. This sample biography and all unconfirmed profile details are placeholders—replace them with artist-approved information before publishing.</p>
          </section>

          <section className="sample-profile-section" id="sample-discography">
            <div className="sample-section-heading"><div><span className="sample-profile-label">RELEASES & COLLABORATIONS</span><h2><Disc3 size={20}/> Featured tracks</h2></div><span>2 sample tracks</span></div>
            <div className="sample-song-grid">{songs.map((song, index) => <article className="sample-song-card" key={song.title}>
              <SampleArtwork song={song}/>
              <div className="sample-song-meta"><span className="sample-profile-label">{index === 0 ? 'YUNG BWOY RELEASE' : 'COLLABORATOR SPOTLIGHT'}</span><h3>{song.title}</h3><p>{song.artist} <span>{song.feature}</span></p><small>{song.type} · {song.genre}</small></div>
              <audio className="sample-audio-player" controls preload="none" src={song.audio} aria-label={`Play ${song.title} by ${song.artist}`}>Your browser does not support audio playback.</audio>
              <details className="sample-lyrics"><summary>Sample lyrics <span>Original demo text—not transcribed lyrics</span></summary><p>{song.lyric}</p></details>
              <p className="sample-song-credit">{song.credit}</p>
            </article>)}</div>
            <p className="sample-profile-caveat">The audio links use the example files supplied in the Junubify repository. “Faded” is credited to Dogg Hustle in the filename and is shown as a collaborator spotlight, not as a Yung Bwoy solo release. Verify ownership, credits, release details, and permissions before public distribution.</p>
          </section>

          <section className="sample-profile-section sample-profile-details">
            <div><span className="sample-profile-label">PROFESSIONAL DETAILS</span><h2>Artist & booking information</h2></div>
            <dl>
              <div><dt>Artist name</dt><dd>Yung Bwoy</dd></div><div><dt>Based in</dt><dd>Juba, South Sudan <small>(sample—confirm)</small></dd></div>
              <div><dt>Genres</dt><dd>Hip-Hop · Afrobeat <small>(sample—confirm)</small></dd></div><div><dt>Booking</dt><dd><Mail size={14}/> Add verified booking email</dd></div>
              <div><dt>Management / press</dt><dd>Add representative and press contact</dd></div><div><dt>Availability</dt><dd><CalendarDays size={14}/> Add performance and booking availability</dd></div>
            </dl>
          </section>

          <section className="sample-profile-section sample-profile-follow">
            <div><span className="sample-profile-label">OFFICIAL LINKS</span><h2>Follow & connect</h2><p>Add verified artist-managed accounts and a press/EPK link.</p></div>
            <div className="sample-link-pills"><span><Instagram size={15}/> Instagram · add official link</span><span><Youtube size={15}/> YouTube · add official link</span><span><ExternalLink size={15}/> Website / EPK · add link</span></div>
          </section>
          <footer className="sample-profile-footer"><BadgeCheck size={15}/> Demo content only. Verification, rights, lyrics, contact details, and social links require confirmation from the artist or authorized representative.</footer>
        </div>
      </section>
    </div>}
  </>;
}

const host = document.createElement('div');
host.id = 'junubify-sample-artist-profile';
document.body.appendChild(host);
createRoot(host).render(<SampleArtistProfile/>);
