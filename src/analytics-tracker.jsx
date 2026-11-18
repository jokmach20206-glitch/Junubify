import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { recordAnalyticsEvent } from './lib/analytics.js';
import { supabase } from './lib/supabase.js';
import './analytics.css';

function AnalyticsTracker() {
  const trackCache = useRef(new Map());
  const submittedPlay = useRef('');
  const searchTimer = useRef(null);
  const lastSearchAt = useRef(0);

  useEffect(() => {
    let disposed = false;
    const resolveTrackId = async (title, artist) => {
      const key = `${title}\u0000${artist}`;
      if (trackCache.current.has(key)) return trackCache.current.get(key);
      if (!window.__junubifySupabase) return null;
      const { data } = await window.__junubifySupabase.from('tracks').select('id').eq('status', 'published').eq('title', title).eq('artist_name', artist).limit(1).maybeSingle();
      if (disposed || !data?.id) return null;
      trackCache.current.set(key, data.id);
      return data.id;
    };

    const onSearch = (event) => {
      if (!event.target.matches('.search')) return;
      window.clearTimeout(searchTimer.current);
      const query = event.target.value.trim();
      if (query.length < 2) return;
      searchTimer.current = window.setTimeout(() => {
        const now = Date.now();
        if (now - lastSearchAt.current < 5000) return;
        lastSearchAt.current = now;
        recordAnalyticsEvent('search');
      }, 1200);
    };

    const audio = document.querySelector('.player audio');
    const onAudioTime = async () => {
      if (!audio || audio.paused || audio.currentTime < 30) return;
      const player = document.querySelector('.player-track');
      const title = player?.querySelector('b')?.textContent?.trim();
      const artist = player?.querySelector('span:not(.player-note)')?.textContent?.trim();
      if (!title || !artist) return;
      const key = `${title}\u0000${artist}`;
      if (submittedPlay.current === key) return;
      submittedPlay.current = key;
      const id = await resolveTrackId(title, artist);
      if (id && !disposed) recordAnalyticsEvent('play', id);
    };
    const onAudioPlay = () => { submittedPlay.current = ''; };

    const onLike = async (event) => {
      const button = event.target.closest('.track-action');
      if (!button || button.classList.contains('liked')) return;
      const row = button.closest('.track-row');
      const title = row?.querySelector('.track-meta strong')?.textContent?.trim();
      const artist = row?.querySelector('.track-meta span')?.textContent?.split('·')[0]?.trim();
      if (!title || !artist) return;
      const id = await resolveTrackId(title, artist);
      if (id && !disposed) recordAnalyticsEvent('like', id);
    };

    document.addEventListener('input', onSearch);
    document.addEventListener('click', onLike);
    audio?.addEventListener('timeupdate', onAudioTime);
    audio?.addEventListener('play', onAudioPlay);
    return () => {
      disposed = true;
      window.clearTimeout(searchTimer.current);
      document.removeEventListener('input', onSearch);
      document.removeEventListener('click', onLike);
      audio?.removeEventListener('timeupdate', onAudioTime);
      audio?.removeEventListener('play', onAudioPlay);
    };
  }, []);
  return <a className="analytics-launcher" href="/analytics.html" aria-label="Open privacy-first analytics">Analytics</a>;
}

const host = document.createElement('div');
host.id = 'junubify-analytics-tracker';
document.body.appendChild(host);
window.__junubifySupabase = supabase;
createRoot(host).render(<AnalyticsTracker/>);
