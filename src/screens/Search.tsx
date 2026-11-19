import { signal } from '@preact/signals';
import { storage } from '../storage';
import { telegram } from '../telegram/client';
import { mapError } from '../telegram/errors';
import type { DocResult, SearchCursor } from '../telegram/types';
import { formatDate, formatSize } from '../format';
import { selected } from '../state';

// Search screen state lives at module level so it survives re-renders.
const query = signal('');
const results = signal<DocResult[]>([]);
const next = signal<SearchCursor | undefined>(undefined);
const searched = signal(false); // true once a search finished (to show "no results")
const loading = signal(false);
const searchError = signal('');
const recent = signal<string[]>(storage.getRecent());

// `more` = fetch the next page and append instead of starting over.
async function doSearch(q: string, more: boolean, onRelogin: () => void) {
  if (loading.value) return;
  loading.value = true;
  searchError.value = '';
  try {
    const page = await telegram.search(q, more ? next.value : undefined);
    if (more) {
      // The same message can appear twice across pages: keep the first one.
      const have = new Set(results.value.map((r) => `${r.ref.chatId}:${r.ref.msgId}`));
      results.value = [...results.value, ...page.items.filter((r) => !have.has(`${r.ref.chatId}:${r.ref.msgId}`))];
    } else {
      results.value = page.items;
      recent.value = storage.addRecent(q);
    }
    next.value = page.next;
    searched.value = true;
  } catch (e) {
    const m = mapError(e);
    searchError.value = m.message;
    if (m.action === 'relogin') onRelogin();
  } finally {
    loading.value = false;
  }
}

function submit(q: string, onRelogin: () => void) {
  const t = q.trim();
  if (!t) return;
  query.value = t;
  next.value = undefined;
  searched.value = false;
  doSearch(t, false, onRelogin);
}

export function Search({ onRelogin }: { onRelogin: () => void }) {
  return (
    <div>
      {/* Search runs only on Enter / "Ara", never while typing (ARCHITECTURE.md §4). */}
      <form
        class="searchbar"
        onSubmit={(e) => {
          e.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur(); // close the keyboard
          submit(query.value, onRelogin);
        }}
      >
        <input
          type="search"
          enterkeyhint="search"
          placeholder="Doküman ara…"
          autocapitalize="off"
          autocorrect="off"
          value={query.value}
          onInput={(e) => (query.value = e.currentTarget.value)}
        />
        <button type="submit" disabled={loading.value}>Ara</button>
      </form>

      {!searched.value && !loading.value && recent.value.length > 0 && (
        <div class="recent">
          <small>Son aramalar</small>
          <div class="chips">
            {recent.value.map((r) => (
              <button type="button" class="chip" key={r} onClick={() => submit(r, onRelogin)}>{r}</button>
            ))}
          </div>
        </div>
      )}

      {loading.value && results.value.length === 0 && <p>Aranıyor…</p>}
      {searchError.value && <p class="error">{searchError.value}</p>}
      {searched.value && results.value.length === 0 && !searchError.value && <p>Sonuç bulunamadı.</p>}

      <ul class="results">
        {results.value.map((r) => (
          <li key={`${r.ref.chatId}:${r.ref.msgId}`}>
            <button type="button" class="card" onClick={() => (selected.value = r)}>
              <strong>{r.fileName}</strong>
              <span>{r.chatTitle}</span>
              <small>{formatDate(r.date)} · {formatSize(r.size)}</small>
            </button>
          </li>
        ))}
      </ul>

      {next.value && (
        <button type="button" class="secondary" disabled={loading.value} onClick={() => doSearch(query.value, true, onRelogin)}>
          {loading.value ? 'Yükleniyor…' : 'Daha fazla'}
        </button>
      )}
    </div>
  );
}
