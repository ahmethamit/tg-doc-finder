import { expect, test } from 'vitest';
import { parseSearchResult } from '../src/telegram/search';

const doc = (name: string | null, size = 1024) => ({
  className: 'MessageMediaDocument',
  document: {
    className: 'Document',
    size,
    mimeType: 'application/pdf',
    attributes: name ? [{ className: 'DocumentAttributeFilename', fileName: name }] : [],
  },
});
const channelMsg = (id: number, media: unknown) => ({
  className: 'Message', id, date: 1700000000, peerId: { className: 'PeerChannel', channelId: 10 }, media,
});
const chats = [{ className: 'Channel', id: 10, title: 'Gazeteler', username: 'gazete', accessHash: 'h' }];

test('keeps documents, drops other media and empty messages', () => {
  const r = parseSearchResult(
    { messages: [channelMsg(1, doc('a.pdf')), channelMsg(2, { className: 'MessageMediaPhoto' }), { className: 'MessageEmpty', id: 3 }], chats, users: [] },
    '999', 30,
  );
  expect(r.items.map((i) => i.fileName)).toEqual(['a.pdf']);
  expect(r.items[0]).toMatchObject({ chatTitle: 'Gazeteler', size: 1024, date: 1700000000, link: 'https://t.me/gazete/1' });
});

test('drops hits from Saved Messages (own user id)', () => {
  const saved = { className: 'Message', id: 5, date: 1, peerId: { className: 'PeerUser', userId: 999 }, media: doc('mine.pdf') };
  const r = parseSearchResult({ messages: [saved], chats: [], users: [{ id: 999, firstName: 'Ben' }] }, '999', 30);
  expect(r.items).toEqual([]);
});

test('file without a name gets a fallback name', () => {
  const r = parseSearchResult({ messages: [channelMsg(42, doc(null))], chats, users: [] }, '999', 30);
  expect(r.items[0].fileName).toBe('telegram_42.pdf');
});

test('private channel without username links to t.me/c', () => {
  const r = parseSearchResult(
    { messages: [channelMsg(7, doc('x.pdf'))], chats: [{ className: 'Channel', id: 10, title: 'Gizli' }], users: [] },
    '999', 30,
  );
  expect(r.items[0].link).toBe('https://t.me/c/10/7');
});

test('next cursor only when a full page came back, from the last raw message', () => {
  const msgs = [channelMsg(1, doc('a.pdf')), channelMsg(2, doc('b.pdf'))];
  const full = parseSearchResult({ messages: msgs, chats, users: [], nextRate: 55 }, '999', 2);
  expect(full.next).toMatchObject({ offsetRate: 55, offsetId: 2, peer: { type: 'channel', id: 10, accessHash: 'h' } });
  const partial = parseSearchResult({ messages: msgs, chats, users: [], nextRate: 55 }, '999', 30);
  expect(partial.next).toBeUndefined();
});
