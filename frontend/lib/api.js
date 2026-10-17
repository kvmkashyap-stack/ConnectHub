const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('connecthub_token');
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, cache: 'no-store' });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) throw new Error(data?.detail || data?.message || `Request failed (${response.status})`);
  return data;
}

export async function login(username, password) {
  const body = new URLSearchParams({ username, password });
  const response = await fetch(`${API_BASE}/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'Could not sign in');
  localStorage.setItem('connecthub_token', data.access_token);
  return data;
}

export async function register(fields) {
  return api('/users/register', { method: 'POST', body: JSON.stringify(fields) });
}

export async function fetchLiveNews(region = 'both') {
  return api(`/api/live/news?region=${region}&limit=20`);
}

export async function fetchLiveTrends(geo = 'both') {
  return api(`/api/live/trends?geo=${geo}`);
}

export async function fetchLiveSocial(category = 'all') {
  return api(`/api/live/social-feed?category=${category}&limit=25`);
}

export async function fetchLiveReels() {
  return api('/api/live/reels?limit=15');
}

export async function fetchLiveTopicPosts(query) {
  return api(`/api/live/topic-feed?query=${encodeURIComponent(query)}&limit=15`);
}
