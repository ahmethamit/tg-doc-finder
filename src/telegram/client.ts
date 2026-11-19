// The ONLY file that talks to GramJS. Screens use this small interface.
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger, LogLevel } from 'telegram/extensions/Logger';
import { storage, type ApiCreds } from '../storage';
import { parseSearchResult, type RawSearchResult } from './search';
import type { AuthState, PeerRef, SearchCursor, SearchPage } from './types';

// GramJS's connect() does NOT throw when the WebSocket cannot be opened, it just
// returns. To learn *why* it failed we keep its last warnings/errors in memory
// (never printed to the console, never stored) and show them if connecting fails.
class MemoryLogger extends Logger {
  lines: string[] = [];
  log(_level: string, message: string) {
    this.lines.push(String(message).slice(0, 120));
    if (this.lines.length > 4) this.lines.shift();
  }
}
const memoryLog = new MemoryLogger(LogLevel.WARN);

async function connectOrThrow(c: TelegramClient) {
  if (c.connected) return;
  await c.connect();
  if (!c.connected) {
    throw new Error(`Telegram'a bağlanılamadı. ${memoryLog.lines.join(' | ')}`);
  }
}

const SEARCH_LIMIT = 30;
let meId = ''; // our own user id, to hide hits from "Saved Messages"

// Rebuild the InputPeer Telegram wants for "continue after this message".
function toInputPeer(p: PeerRef) {
  // GramJS wants its own big-integer objects, which is exactly what we kept in PeerRef.
  const id = p.id as never;
  const accessHash = p.accessHash as never;
  if (p.type === 'chat') return new Api.InputPeerChat({ chatId: id });
  if (!accessHash) return new Api.InputPeerEmpty(); // cannot address it: start over
  return p.type === 'channel'
    ? new Api.InputPeerChannel({ channelId: id, accessHash })
    : new Api.InputPeerUser({ userId: id, accessHash });
}

let client: TelegramClient | null = null;
let creds: ApiCreds | null = null;
let phone = '';
let phoneCodeHash = '';

function need(): TelegramClient {
  if (!client) throw new Error('Telegram client not initialised');
  return client;
}

// Persist the session after every successful login (it is what keeps us signed in).
function saveSession() {
  storage.setSession(need().session.save() as unknown as string);
}

export const telegram = {
  async init(c: ApiCreds, session: string | null): Promise<AuthState> {
    creds = c;
    client = new TelegramClient(new StringSession(session ?? ''), c.apiId, c.apiHash, {
      useWSS: true, // WebSocket over port 443: the only option in a browser
      connectionRetries: 5,
      floodSleepThreshold: 60,
      deviceModel: 'TG Doc Finder (iPhone)',
      systemVersion: 'iOS PWA',
      appVersion: __APP_VERSION__,
      baseLogger: memoryLog,
    });
    await connectOrThrow(client);
    return (await client.checkAuthorization()) ? 'authorized' : 'needs-login';
  },

  async sendCode(phoneNumber: string): Promise<void> {
    await connectOrThrow(need()); // retry the connection if init could not open it
    const r = await need().sendCode({ apiId: creds!.apiId, apiHash: creds!.apiHash }, phoneNumber);
    phone = phoneNumber;
    phoneCodeHash = r.phoneCodeHash;
  },

  async signIn(code: string): Promise<'ok' | 'needs-password'> {
    try {
      await need().invoke(new Api.auth.SignIn({ phoneNumber: phone, phoneCodeHash, phoneCode: code }));
    } catch (e) {
      if ((e as { errorMessage?: string }).errorMessage === 'SESSION_PASSWORD_NEEDED') return 'needs-password';
      throw e;
    }
    saveSession();
    return 'ok';
  },

  async checkPassword(password: string): Promise<void> {
    await need().signInWithPassword(
      { apiId: creds!.apiId, apiHash: creds!.apiHash },
      {
        password: async () => password,
        // Throw instead of re-asking, so the screen can show the error itself.
        onError: async (err) => { throw err; },
      },
    );
    saveSession();
  },

  // Global document search across all chats (ARCHITECTURE.md §5.1).
  async search(q: string, offset?: SearchCursor): Promise<SearchPage> {
    const c = need();
    await connectOrThrow(c);
    if (!meId) meId = String(((await c.getMe()) as Api.User).id);
    const res = await c.invoke(
      new Api.messages.SearchGlobal({
        q,
        filter: new Api.InputMessagesFilterDocument(),
        minDate: 0,
        maxDate: 0,
        offsetRate: offset?.offsetRate ?? 0,
        offsetPeer: offset ? toInputPeer(offset.peer) : new Api.InputPeerEmpty(),
        offsetId: offset?.offsetId ?? 0,
        limit: SEARCH_LIMIT,
      }),
    );
    if (res.className === 'messages.MessagesNotModified') return { items: [] };
    return parseSearchResult(res as unknown as RawSearchResult, meId, SEARCH_LIMIT);
  },

  async logOut(): Promise<void> {
    try { await need().invoke(new Api.auth.LogOut()); } catch { /* already invalid: fine */ }
    storage.clearSession();
    meId = '';
    try { await need().disconnect(); } catch { /* ignore */ }
    client = null;
  },

  // iOS drops WebSockets of background PWAs; call when the app becomes visible.
  async ensureConnected(): Promise<void> {
    if (client) await connectOrThrow(client);
  },
};
