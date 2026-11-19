// Turns Telegram's SearchGlobal answer into our own types.
// Pure on purpose (no GramJS import): it only looks at `className`, so it can be
// unit-tested with plain objects.
import { fallbackFileName } from '../format';
import type { DocResult, PeerRef, SearchPage } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;

export type RawSearchResult = {
  messages: Raw[];
  chats: Raw[];
  users: Raw[];
  nextRate?: number;
};

const s = (v: unknown) => String(v);

// Which chat a message's `peerId` points to, as a PeerRef plus a display title.
function resolvePeer(peerId: Raw, chats: Raw[], users: Raw[]): { peer: PeerRef; title: string; chat?: Raw } | null {
  if (peerId.className === 'PeerChannel') {
    const chat = chats.find((c) => s(c.id) === s(peerId.channelId));
    return { peer: { type: 'channel', id: peerId.channelId, accessHash: chat?.accessHash }, title: chat?.title ?? '', chat };
  }
  if (peerId.className === 'PeerChat') {
    const chat = chats.find((c) => s(c.id) === s(peerId.chatId));
    return { peer: { type: 'chat', id: peerId.chatId }, title: chat?.title ?? '', chat };
  }
  if (peerId.className === 'PeerUser') {
    const u = users.find((x) => s(x.id) === s(peerId.userId));
    const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.username || '';
    return { peer: { type: 'user', id: peerId.userId, accessHash: u?.accessHash }, title: name };
  }
  return null;
}

export function parseSearchResult(res: RawSearchResult, meId: string, limit: number): SearchPage {
  const items: DocResult[] = [];
  const seen = new Set<string>();

  for (const m of res.messages) {
    if (m.className !== 'Message' || m.media?.className !== 'MessageMediaDocument') continue;
    const doc = m.media.document;
    if (doc?.className !== 'Document') continue;
    // Skip hits in our own "Saved Messages" chat (ARCHITECTURE.md §5.1).
    if (m.peerId?.className === 'PeerUser' && s(m.peerId.userId) === meId) continue;

    const where = resolvePeer(m.peerId ?? {}, res.chats, res.users);
    if (!where) continue;

    const chatId = `${where.peer.type}:${s(where.peer.id)}`;
    const key = `${chatId}:${m.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const nameAttr = (doc.attributes ?? []).find((a: Raw) => a.className === 'DocumentAttributeFilename');
    const mimeType: string = doc.mimeType ?? '';

    let link: string | undefined;
    if (where.peer.type === 'channel') {
      link = where.chat?.username
        ? `https://t.me/${where.chat.username}/${m.id}`
        : `https://t.me/c/${s(where.peer.id)}/${m.id}`;
    }

    items.push({
      ref: { chatId, msgId: m.id, peer: where.peer },
      fileName: nameAttr?.fileName || fallbackFileName(m.id, mimeType),
      mimeType,
      size: Number(s(doc.size)),
      date: m.date,
      chatTitle: where.title,
      link,
    });
  }

  // The next page starts after the LAST RAW message (not the last kept item),
  // because we may have filtered some hits out.
  let next: SearchPage['next'];
  const last = res.messages[res.messages.length - 1];
  if (res.nextRate !== undefined && last && res.messages.length >= limit) {
    const where = resolvePeer(last.peerId ?? {}, res.chats, res.users);
    if (where) next = { offsetRate: res.nextRate, offsetId: last.id, peer: where.peer };
  }
  return { items, next };
}
