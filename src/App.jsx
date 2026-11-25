function getTrackCoverFallback(track) {
  if (typeof track?.cover === 'string' && track.cover.trim()) return track.cover;
  if (typeof track?.coverUrl === 'string' && track.coverUrl.trim()) return track.coverUrl;
  return fallbackCover;
}

function handleCoverError(event) {
  if (event.currentTarget.src !== new URL(fallbackCover, window.location.href).href) {
    event.currentTarget.src = fallbackCover;
  }
}
