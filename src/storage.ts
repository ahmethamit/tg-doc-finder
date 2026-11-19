// All localStorage access goes through this file, so encryption (Phase 5 PIN)
// can be added in one place. NEVER log anything read from here: the session
// string is the key to the whole Telegram account.
const KEYS = { creds: 'tdf.creds', session: 'tdf.session', recent: 'tdf.recent' } as const;

export type ApiCreds = { apiId: number; apiHash: string };

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export const storage = {
  getCreds(): ApiCreds | null {
    const raw = read(KEYS.creds);
    if (!raw) return null;
    try {
      const c = JSON.parse(raw);
      return Number.isInteger(c.apiId) && typeof c.apiHash === 'string' ? c : null;
    } catch { return null; }
  },
  setCreds(c: ApiCreds) { localStorage.setItem(KEYS.creds, JSON.stringify(c)); },
  getSession(): string | null { return read(KEYS.session); },
  setSession(s: string) { localStorage.setItem(KEYS.session, s); },
  getRecent(): string[] {
    try {
      const r = JSON.parse(read(KEYS.recent) ?? '[]');
      return Array.isArray(r) ? r.filter((x) => typeof x === 'string').slice(0, 5) : [];
    } catch { return []; }
  },
  // Newest first, no duplicates (case-insensitive), at most 5.
  addRecent(q: string): string[] {
    const list = [q, ...this.getRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    try { localStorage.setItem(KEYS.recent, JSON.stringify(list)); } catch { /* ignore */ }
    return list;
  },
  clearSession() { localStorage.removeItem(KEYS.session); },
  clearAll() { localStorage.removeItem(KEYS.creds); localStorage.removeItem(KEYS.session); },
  // Ask iOS not to evict our storage when space is low.
  async requestPersist() { try { await navigator.storage?.persist?.(); } catch { /* ignore */ } },
};
