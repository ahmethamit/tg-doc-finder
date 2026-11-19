import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { storage } from './storage';
import { telegram } from './telegram/client';
import { mapError } from './telegram/errors';
import { Search } from './screens/Search';
import { FileDetail } from './screens/FileDetail';
import { selected } from './state';

// Phase 1 screens: setup -> phone -> code -> (2FA password) -> signed in.
// The real search UI comes in Phase 2.
type Screen = 'loading' | 'setup' | 'phone' | 'code' | 'password' | 'home';

const screen = signal<Screen>('loading');
const error = signal('');
const busy = signal(false);

// Runs an async action, shows its error (Turkish) and prevents double taps.
async function run(fn: () => Promise<void>) {
  error.value = '';
  busy.value = true;
  try {
    await fn();
  } catch (e) {
    const m = mapError(e);
    error.value = m.message;
    if (m.action === 'relogin') screen.value = 'phone';
  } finally {
    busy.value = false;
  }
}

async function start() {
  const creds = storage.getCreds();
  if (!creds) { screen.value = 'setup'; return; }
  await run(async () => {
    const state = await telegram.init(creds, storage.getSession());
    screen.value = state === 'authorized' ? 'home' : 'phone';
  });
  // If connecting failed, still let the user reach a usable screen.
  if (screen.value === 'loading') screen.value = 'phone';
}

function Setup() {
  let id = '';
  let hash = '';
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const apiId = Number(id.trim());
      if (!Number.isInteger(apiId) || apiId <= 0 || !hash.trim()) { error.value = 'API ID ve API Hash gerekli'; return; }
      storage.setCreds({ apiId, apiHash: hash.trim() });
      storage.requestPersist();
      screen.value = 'loading';
      start();
    }}>
      <p>my.telegram.org → API development tools adresinden aldığın değerleri gir. Bunlar yalnızca bu telefonda saklanır.</p>
      <input inputMode="numeric" placeholder="API ID" onInput={(e) => (id = e.currentTarget.value)} />
      <input placeholder="API Hash" autocapitalize="off" autocorrect="off" onInput={(e) => (hash = e.currentTarget.value)} />
      <button type="submit">Kaydet</button>
    </form>
  );
}

function Phone() {
  let phone = '';
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      run(async () => { await telegram.sendCode(phone.trim()); screen.value = 'code'; });
    }}>
      <input type="tel" placeholder="+90 5xx xxx xx xx" autocomplete="tel" onInput={(e) => (phone = e.currentTarget.value)} />
      <button type="submit" disabled={busy.value}>Kod gönder</button>
    </form>
  );
}

function Code() {
  let code = '';
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      run(async () => {
        const r = await telegram.signIn(code.trim());
        screen.value = r === 'ok' ? 'home' : 'password';
      });
    }}>
      <p>Telegram uygulamana gelen kodu gir.</p>
      <input inputMode="numeric" autocomplete="one-time-code" placeholder="Kod" onInput={(e) => (code = e.currentTarget.value)} />
      <button type="submit" disabled={busy.value}>Giriş yap</button>
    </form>
  );
}

function Password() {
  let pw = '';
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      run(async () => { await telegram.checkPassword(pw); screen.value = 'home'; });
    }}>
      <p>İki adımlı doğrulama şifren.</p>
      <input type="password" placeholder="Şifre" onInput={(e) => (pw = e.currentTarget.value)} />
      <button type="submit" disabled={busy.value}>Giriş yap</button>
    </form>
  );
}

function Home() {
  const relogin = () => { selected.value = null; screen.value = 'phone'; };
  // Search state is kept in module-level signals, so going back shows the same results.
  if (selected.value) {
    return <FileDetail doc={selected.value} onBack={() => (selected.value = null)} onRelogin={relogin} />;
  }
  return (
    <div>
      <Search onRelogin={relogin} />
      {/* A proper Settings screen (with logout) arrives in Phase 4. */}
      <button class="secondary" onClick={() => run(async () => { await telegram.logOut(); relogin(); })}>Çıkış yap</button>
    </div>
  );
}

export function App() {
  useEffect(() => {
    start();
    // iOS closes the WebSocket of background apps: reconnect when we come back.
    const onVisible = () => { if (document.visibilityState === 'visible') telegram.ensureConnected().catch(() => {}); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const s = screen.value;
  return (
    <main>
      <h1>TG Doc Finder</h1>
      {s === 'loading' && <p>Bağlanıyor…</p>}
      {s === 'setup' && <Setup />}
      {s === 'phone' && <Phone />}
      {s === 'code' && <Code />}
      {s === 'password' && <Password />}
      {s === 'home' && <Home />}
      {error.value && <p class="error">{error.value}</p>}
    </main>
  );
}
