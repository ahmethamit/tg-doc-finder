// The ONLY file that talks to GramJS. Screens use this small interface.
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { LogLevel } from 'telegram/extensions/Logger';
import { storage, type ApiCreds } from '../storage';
import type { AuthState } from './types';

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
    });
    client.setLogLevel(LogLevel.NONE); // GramJS logs can contain sensitive data
    await client.connect();
    return (await client.checkAuthorization()) ? 'authorized' : 'needs-login';
  },

  async sendCode(phoneNumber: string): Promise<void> {
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

  async logOut(): Promise<void> {
    try { await need().invoke(new Api.auth.LogOut()); } catch { /* already invalid: fine */ }
    storage.clearSession();
    try { await need().disconnect(); } catch { /* ignore */ }
    client = null;
  },

  // iOS drops WebSockets of background PWAs; call when the app becomes visible.
  async ensureConnected(): Promise<void> {
    if (client && !client.connected) await client.connect();
  },
};
