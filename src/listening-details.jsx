import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, BadgeCheck, ChevronDown, Heart, ListMusic, Music2, Pause, Play, Share2 } from 'lucide-react';
import './listening-details.css';

const formatTime = (value) => {
  const seconds = Number.isFinite(value) ? Math.floor(value) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

function ListeningDetails() {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState({ title: '', artist: '', cover: '', currentTime: 0, duration: 0, playing: false });

  const getAudio = () => document.querySelector('.player audio');

  useEffect(() => {
    const update = () => {
      const player = document.querySelector('.player');
      const audioElement = player?.querySelector('audio');
      const title = player?.querySelector('.player-track b')?.textContent?.trim() || '';
      const artist = player?.querySelector('.player-track span:not(.player-note)')?.textContent?.trim() || '';
      const cover = player?.querySelector('.player-track img')?.src || '';
      setSnapshot({
        title,
        artist,
        cover,
        currentTime: audioElement?.currentTime || 0,
        duration: Number.isFinite(audioElement?.duration) ? audioElement.duration : 0,
        playing: Boolean(audioElement && !audioElement.paused),
      });
    };
    update();
    const timer = window.setInterval(update, 500);
    const observer = new MutationObserver(update);
    const player = document.querySelector('.player');
    if (player) observer.observe(player, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => { window.clearInterval(timer); observer.disconnect(); };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('details-open');
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.classList.remove('details-open'); };
  }, [open]);

  const togglePlayback = () => {
    const element = getAudio();
    if (!element) return;
    if (element.paused) element.play().catch(() => {});
    else element.pause();
  };

  const skip = (direction) => {
    const label = direction === 'next' ? 'Next track' : 'Previous track';
    document.querySelector(`.player-progress button[aria-label="${label}"]`)?.click();
  };

  const like = () => {
    document.querySelector('.mobile-like')?.click();
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: snapshot.title, text: `Listen to ${snapshot.title} by ${snapshot.artist} on Junubify`, url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(url);
    } catch { /* Sharing can be dismissed by the user. */ }
  };

  const openArtistStudio = () => {
    [...document.querySelectorAll('.nav-tabs button')].find((button) => button.textContent.toLowerCase().includes('studio'))?.click();
    setOpen(false);
  };

  return <>
    {snapshot.title && <button className="details-trigger" onClick={() => setOpen(true)} aria-label="Open track details"><ListMusic size={17}/><span>Track details</span></button>}
    {open && <div className="details-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="details-sheet" role="dialog" aria-modal="true" aria-label={`${snapshot.title} track details`}>
        <header className="details-header">
          <button onClick={() => setOpen(false)} aria-label="Close track details"><ChevronDown size={22}/></button>
          <span>NOW PLAYING</span>
          <button onClick={share} aria-label="Share this track"><Share2 size={19}/></button>
        </header>
        <div className="details-content">
          <div className="details-track-hero">
            {snapshot.cover ? <img src={snapshot.cover} alt={`${snapshot.title} cover art`}/> : <div className="details-art-placeholder"><Music2 size={54}/></div>}
            <div className="details-track-copy"><span className="details-eyebrow">JUNUBIFY • TRACK</span><h1>{snapshot.title}</h1><p>{snapshot.artist || 'Independent artist'}</p></div>
            <button className="details-like" onClick={like} aria-label="Like this song"><Heart size={21}/></button>
          </div>
          <div className="details-timeline">
            <input aria-label="Seek track" type="range" min="0" max={snapshot.duration || 1} step="1" value={Math.min(snapshot.currentTime, snapshot.duration || 1)} onChange={(event) => { const element = getAudio(); if (element) element.currentTime = Number(event.target.value); }}/>
            <div><span>{formatTime(snapshot.currentTime)}</span><span>{formatTime(snapshot.duration)}</span></div>
          </div>
          <div className="details-controls">
            <button onClick={() => skip('previous')} aria-label="Previous track"><ArrowLeft size={23}/></button>
            <button className="details-main-play" onClick={togglePlayback} aria-label={snapshot.playing ? 'Pause' : 'Play'}>{snapshot.playing ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor"/>}</button>
            <button onClick={() => skip('next')} aria-label="Next track"><ArrowRight size={23}/></button>
          </div>
          <section className="details-card lyrics-card">
            <div className="details-card-heading"><div><span className="details-eyebrow">SING ALONG</span><h2>Lyrics</h2></div><Music2 size={20}/></div>
            <p className="details-empty">Lyrics haven’t been added for this track yet.</p>
            <button className="details-text-action" onClick={openArtistStudio}>Are you the artist? Submit track details <ArrowRight size={15}/></button>
          </section>
          <section className="details-card artist-card">
            <span className="details-eyebrow">ABOUT THE ARTIST</span>
            <div className="artist-detail-row"><div className="artist-avatar"><Music2 size={23}/></div><div><h2>{snapshot.artist || 'Independent artist'}</h2><p>Discover more music from this artist on Junubify.</p></div><BadgeCheck size={19} className="artist-check"/></div>
            <button className="details-outline-action" onClick={openArtistStudio}>Artist information <ArrowRight size={15}/></button>
          </section>
          <section className="details-card credits-card">
            <div className="details-card-heading"><div><span className="details-eyebrow">THE PEOPLE BEHIND THE MUSIC</span><h2>Credits</h2></div></div>
            <div className="credit-detail"><span>{snapshot.artist || 'Artist'}</span><small>Artist</small></div>
            <p className="credits-note">Additional songwriter and production credits will appear here when provided by the artist.</p>
          </section>
        </div>
      </section>
    </div>}
  </>;
}

const host = document.createElement('div');
host.id = 'junubify-listening-details';
document.body.appendChild(host);
createRoot(host).render(<ListeningDetails/>);
