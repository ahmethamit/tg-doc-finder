# CLAUDE.md

Guidance for Claude Code in this repository.

## What this is

TG Doc Finder: a serverless iPhone PWA that searches documents across the
user's Telegram chats (GramJS in the browser) and hands the file to the iOS
share sheet (Gmail/Mail). Hosted on GitHub Pages. **Read
[ARCHITECTURE.md](ARCHITECTURE.md) first — it is the source of truth.** If a
decision changes, update ARCHITECTURE.md in the same change.

## Working rules

- Build in the phase order of ARCHITECTURE.md §9. Each phase must deploy and
  meet its acceptance criteria before starting the next. Phase 1 (GramJS in
  the browser) comes before any real UI work.
- All GramJS calls live in `src/telegram/`. Screens and components never import
  `telegram` directly.
- `navigator.share()` is only called synchronously from the "Paylaş" click
  handler with an already-downloaded `File` (no `await` before it) — iOS
  rejects it otherwise (ARCHITECTURE.md D6).
- Never commit or log secrets: API ID/Hash, phone numbers, session strings.
  They are entered at runtime and stored on the device only. The repo is
  public.
- Never cache Telegram traffic or downloaded files in the service worker.
- UI text is Turkish. Code, identifiers and commit messages are English.
- Pin the `telegram` (GramJS) version exactly in `package.json`.
- Keep pure logic (formatting, result merging, error mapping) in plain
  modules with vitest tests; run `npm test` before committing.

## The user

Ahmet: mechanical/manufacturing engineer, beginner in JavaScript/TypeScript.
When you write non-obvious code, add a short comment explaining *why*, and
summarize what changed in plain language at the end of each task.

## Commands (once Phase 0 exists)

```bash
npm install
npm run dev      # local dev server
npm test         # vitest
npm run build    # production build into dist/
```

Deploy = push to `main`; GitHub Actions publishes to
`https://ahmethamit.github.io/tg-doc-finder/`.
