import { supabase } from './supabase.js';

const REGION_STORAGE_KEY = 'junubify-analytics-region';
const ANALYTICS_ENABLED_KEY = 'junubify-analytics-enabled';
const ALLOWED_REGIONS = new Set(['south_sudan', 'east_africa', 'africa_other', 'europe', 'north_america', 'other']);

export function isAnalyticsEnabled() {
  try {
    return localStorage.getItem(ANALYTICS_ENABLED_KEY) !== 'false';
  } catch {
    return false;
  }
}

export function getAnalyticsRegion() {
  try {
    const region = localStorage.getItem(REGION_STORAGE_KEY);
    return ALLOWED_REGIONS.has(region) ? region : null;
  } catch { return null; }
}

export function setAnalyticsRegion(region) {
  try {
    if (!region) localStorage.removeItem(REGION_STORAGE_KEY);
    else if (ALLOWED_REGIONS.has(region)) localStorage.setItem(REGION_STORAGE_KEY, region);
  } catch { /* Analytics region sharing is optional; storage can be unavailable. */ }
}

export async function recordAnalyticsEvent(eventName, trackId = null) {
  if (!supabase || !isAnalyticsEnabled() || !['play', 'like', 'search'].includes(eventName)) return;
  try {
    await supabase.rpc('record_analytics_event', {
      p_event_name: eventName,
      p_track_id: trackId,
      p_region_code: getAnalyticsRegion(),
    });
  } catch {
    // Analytics are best-effort and must never disrupt listening or search.
  }
}

export async function fetchAnalyticsDashboard(days = 30) {
  if (!supabase) throw new Error('Connect Supabase to view analytics.');
  const { data, error } = await supabase.rpc('get_analytics_dashboard', { p_days: days });
  if (error) throw error;
  return data;
}
