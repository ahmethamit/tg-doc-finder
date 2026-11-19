export type AuthState = 'authorized' | 'needs-login';

// A chat as GramJS knows it. `id` and `accessHash` stay as the original GramJS
// big-integer objects (we never need to do math on them), so the search client can
// turn them back into an InputPeer when it asks Telegram for the next page.
export type PeerRef = {
  type: 'channel' | 'chat' | 'user';
  id: unknown;
  accessHash?: unknown;
};

// Enough to fetch the message again later (Phase 3: download).
export type DocRef = { chatId: string; msgId: number; peer: PeerRef };

export type DocResult = {
  ref: DocRef;
  fileName: string; // falls back to `telegram_<msgId><ext>` when Telegram has no name
  mimeType: string;
  size: number; // bytes
  date: number; // unix seconds
  chatTitle: string;
  link?: string; // https://t.me/<username>/<id> or t.me/c/<id>/<msgId>
};

// Where the next page of a global search starts (Telegram's offsetRate/Peer/Id).
export type SearchCursor = { offsetRate: number; offsetId: number; peer: PeerRef };

export type SearchPage = { items: DocResult[]; next?: SearchCursor };
