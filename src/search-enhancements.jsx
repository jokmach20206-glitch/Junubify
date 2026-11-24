import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { Search, X, Pencil, Trash2, Plus, Music2 } from 'lucide-react';

const STORAGE_KEY = 'junubify-track-suggestions';
const emptySuggestion = { title: '', artist: '', genre: '', note: '' };

function getSuggestions() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : [];
  } catch {
    return [];
  }
}

function SearchActions() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suggestions, setSuggestions] = useState(getSuggestions);
  const [draft, setDraft] = useState(emptySuggestion);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');

  const commit = (next) => {
    setSuggestions(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setMessage('Suggestion saved on this device. It has not been sent to Junubify.');
    } catch {
      setMessage('Could not save this suggestion. Check your device storage settings.');
    }
  };

  const focusSearch = () => {
    const input = document.querySelector('.topbar .search');
    if (!input) return;
    document.querySelector('.nav-tabs button')?.click();
    input.focus();
    window.setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const clearSearch = () => {
    const input = document.querySelector('.topbar .search');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  };

  useEffect(() => {
    const input = document.querySelector('.topbar .search');
    if (!input) return undefined;
    const submitSearch = (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      focusSearch();
    };
    input.addEventListener('keydown', submitSearch);
    return () => input.removeEventListener('keydown', submitSearch);
  });

  const saveDraft = (event) => {
    event.preventDefault();
    const title = draft.title.trim();
    const artist = draft.artist.trim();
    if (!title || !artist) {
      setMessage('Add both a track title and artist name.');
      return;
    }
    const item = { ...draft, title, artist, id: editingId || `${Date.now()}-${Math.random().toString(36).slice(2)}`, updatedAt: new Date().toISOString() };
    const next = editingId
      ? suggestions.map((suggestion) => suggestion.id === editingId ? item : suggestion)
      : [item, ...suggestions].slice(0, 50);
    commit(next);
    setDraft(emptySuggestion);
    setEditingId(null);
  };

  const editSuggestion = (suggestion) => {
    setDraft({ title: suggestion.title || '', artist: suggestion.artist || '', genre: suggestion.genre || '', note: suggestion.note || '' });
    setEditingId(suggestion.id);
    setMessage('');
  };

  const cancelEdit = () => {
    setDraft(emptySuggestion);
    setEditingId(null);
  };

  const deleteSuggestion = (id) => commit(suggestions.filter((suggestion) => suggestion.id !== id));

  useEffect(() => {
    if (!dialogOpen) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') setDialogOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dialogOpen]);

  const header = document.querySelector('.topbar');
  if (!header) return null;

  return createPortal(
    <div className="junubify-search-actions">
      <button className="junubify-search-submit" type="button" onClick={focusSearch} aria-label="Search the catalog"><Search size={16} /><span>Search</span></button>
      <button className="junubify-suggest-open" type="button" onClick={() => { setDialogOpen(true); setMessage(''); }}><Plus size={16} /><span>Suggest</span></button>
      {dialogOpen && <div className="junubify-suggest-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogOpen(false); }}>
        <section className="junubify-suggest-dialog" role="dialog" aria-modal="true" aria-labelledby="junubify-suggest-title">
          <button className="junubify-suggest-close" type="button" onClick={() => setDialogOpen(false)} aria-label="Close suggestions"><X size={19} /></button>
          <span className="junubify-suggest-kicker"><Music2 size={15} /> HELP BUILD THE CATALOG</span>
          <h2 id="junubify-suggest-title">Suggest a track</h2>
          <p>Save a track idea and manage your suggestions from this device.</p>
          <form onSubmit={saveDraft} className="junubify-suggest-form">
            <label>Track title<input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={120} required /></label>
            <label>Artist<input value={draft.artist} onChange={(event) => setDraft({ ...draft, artist: event.target.value })} maxLength={120} required /></label>
            <label>Genre (optional)<input value={draft.genre} onChange={(event) => setDraft({ ...draft, genre: event.target.value })} maxLength={60} /></label>
            <label>Why should we feature it? (optional)<textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} maxLength={400} rows={3} /></label>
            <div className="junubify-suggest-actions"><button className="junubify-suggest-save" type="submit">{editingId ? 'Save changes' : 'Save suggestion'}</button>{editingId && <button className="junubify-suggest-cancel" type="button" onClick={cancelEdit}>Cancel edit</button>}</div>
          </form>
          {message && <p className="junubify-suggest-message" role="status">{message}</p>}
          <div className="junubify-suggestion-list"><h3>Your saved suggestions <span>{suggestions.length}</span></h3>
            {suggestions.length ? suggestions.map((suggestion) => <article key={suggestion.id} className="junubify-suggestion-item"><div><strong>{suggestion.title}</strong><span>{suggestion.artist}{suggestion.genre ? ` · ${suggestion.genre}` : ''}</span>{suggestion.note && <small>{suggestion.note}</small>}</div><button type="button" onClick={() => editSuggestion(suggestion)} aria-label={`Edit ${suggestion.title}`}><Pencil size={15} /></button><button type="button" onClick={() => deleteSuggestion(suggestion.id)} aria-label={`Delete ${suggestion.title}`}><Trash2 size={15} /></button></article>) : <p className="junubify-suggestion-empty">No saved suggestions yet.</p>}
          </div>
          <small className="junubify-suggest-disclaimer">Suggestions are saved locally and are not submitted for review.</small>
        </section>
      </div>}
    </div>,
    header,
  );
}

const mount = document.createElement('div');
mount.id = 'junubify-search-enhancements';
document.body.appendChild(mount);
const root = createRoot(mount);
function renderActions() { root.render(<SearchActions />); }
renderActions();
const observer = new MutationObserver(renderActions);
observer.observe(document.body, { childList: true, subtree: true });
