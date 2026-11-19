import { expect, test } from 'vitest';
import { mapError } from '../src/telegram/errors';

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
test('unknown error', () => {
  expect(mapError(new Error('xyz')).message).toBe('Beklenmeyen hata: xyz');
});
