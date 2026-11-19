import { expect, test } from 'vitest';
import { mapError, UserError } from '../src/telegram/errors';

test('our own Turkish messages pass through unchanged', () => {
  expect(mapError(new UserError('Dosya indirilemedi')).message).toBe('Dosya indirilemedi');
});
test('expired file reference', () => {
  expect(mapError({ errorMessage: 'FILE_REFERENCE_EXPIRED' }).message).toContain('süresi doldu');
});

test('wrong code', () => {
  expect(mapError({ errorMessage: 'PHONE_CODE_INVALID' })).toEqual({ message: 'Kod hatalı', action: 'retry-code' });
});
test('flood wait shows seconds', () => {
  expect(mapError({ errorMessage: 'FLOOD_WAIT_120' }).message).toBe('120 sn sonra tekrar deneyin');
});
test('revoked session forces re-login', () => {
  expect(mapError({ errorMessage: 'AUTH_KEY_UNREGISTERED' }).action).toBe('relogin');
});
test('network error', () => {
  expect(mapError(new Error('WebSocket closed')).message).toBe('Bağlantı yok');
});
test('connect failure keeps the reason', () => {
  const m = mapError(new Error("Telegram'a bağlanılamadı. WebSocket was closed"));
  expect(m.message).toContain('WebSocket was closed');
});
test('unknown error', () => {
  expect(mapError(new Error('xyz')).message).toBe('Beklenmeyen hata: xyz');
});
