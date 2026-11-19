// Pure function (no GramJS import) so it is easy to unit-test.
export type ErrorAction = 'none' | 'retry-code' | 'ask-password' | 'relogin';

export type MappedError = { message: string; action: ErrorAction };

// For failures whose Turkish message we wrote ourselves: shown to the user as is.
export class UserError extends Error {}

// GramJS RPC errors carry the Telegram error text in `errorMessage`
// (e.g. "PHONE_CODE_INVALID", "FLOOD_WAIT_120"); network errors are plain Errors.
export function mapError(e: unknown): MappedError {
  if (e instanceof UserError) return { message: e.message, action: 'none' };
  const raw = String((e as { errorMessage?: string })?.errorMessage ?? (e as Error)?.message ?? e);

  // Our own connect failure already carries GramJS's reason; keep it visible.
  if (raw.startsWith("Telegram'a bağlanılamadı")) return { message: raw.slice(0, 400), action: 'none' };

  const flood =/FLOOD_WAIT_(\d+)/.exec(raw);
  if (flood) return { message: `${flood[1]} sn sonra tekrar deneyin`, action: 'none' };

  if (raw.includes('FILE_REFERENCE_EXPIRED')) return { message: 'Dosya bağlantısının süresi doldu, tekrar deneyin', action: 'none' };
  if (raw.includes('PHONE_CODE_INVALID')) return { message: 'Kod hatalı', action: 'retry-code' };
  if (raw.includes('PHONE_CODE_EXPIRED')) return { message: 'Kodun süresi doldu, yeni kod isteyin', action: 'retry-code' };
  if (raw.includes('PHONE_NUMBER_INVALID')) return { message: 'Telefon numarası geçersiz (+90… biçiminde yazın)', action: 'none' };
  if (raw.includes('PASSWORD_HASH_INVALID')) return { message: 'İki adımlı doğrulama şifresi hatalı', action: 'none' };
  if (raw.includes('SESSION_PASSWORD_NEEDED')) return { message: 'İki adımlı doğrulama şifresi gerekli', action: 'ask-password' };
  if (raw.includes('AUTH_KEY_UNREGISTERED') || raw.includes('SESSION_REVOKED') || raw.includes('AUTH_KEY_DUPLICATED'))
    return { message: 'Oturum kapandı, tekrar giriş yapın', action: 'relogin' };
  if (raw.includes('API_ID_INVALID')) return { message: 'API ID / API Hash hatalı', action: 'none' };
  if (/timeout|network|fetch|WebSocket|offline/i.test(raw)) return { message: 'Bağlantı yok', action: 'none' };

  // Show the short technical text so unknown failures can be diagnosed from a phone
  // screenshot. Error texts from GramJS/Telegram never contain the phone or session.
  return { message: `Beklenmeyen hata: ${raw.slice(0, 400)}`, action: 'none' };
}
