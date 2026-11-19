import { expect, test } from 'vitest';
import { fallbackFileName, formatDate, formatSize } from '../src/format';

test('size in MB with Turkish comma', () => {
  expect(formatSize(4.25 * 1024 * 1024)).toBe('4,3 MB');
  expect(formatSize(40 * 1024 * 1024)).toBe('40,0 MB');
});
test('small sizes in KB, never 0 KB', () => {
  expect(formatSize(2048)).toBe('2 KB');
  expect(formatSize(10)).toBe('1 KB');
});
test('bad size gives empty text', () => {
  expect(formatSize(NaN)).toBe('');
});
test('date as dd.mm.yyyy', () => {
  // Noon UTC avoids day changes in any time zone.
  expect(formatDate(Date.UTC(2026, 10, 5, 12) / 1000)).toBe('05.11.2026');
});
test('fallback file name uses known extension', () => {
  expect(fallbackFileName(77, 'application/pdf')).toBe('telegram_77.pdf');
  expect(fallbackFileName(77, 'x/unknown')).toBe('telegram_77');
});
