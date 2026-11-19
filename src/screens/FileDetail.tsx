import { useState } from 'preact/hooks';
import { telegram } from '../telegram/client';
import { mapError } from '../telegram/errors';
import { shareFile } from '../share';
import { BIG_FILE_BYTES, formatDate, formatSize } from '../format';
import type { DocResult } from '../telegram/types';

type Status = 'idle' | 'downloading' | 'ready';

// Two steps on purpose (ARCHITECTURE.md D6): "İndir" first, then a separate
// "Paylaş" tap, because iOS needs a fresh tap to open the share sheet.
export function FileDetail({ doc, onBack, onRelogin }: { doc: DocResult; onBack: () => void; onRelogin: () => void }) {
  // If this very file was downloaded before, it is still in memory: go straight to "Paylaş".
  const [file, setFile] = useState<File | null>(() => telegram.cachedFile(doc.ref));
  const [status, setStatus] = useState<Status>(() => (file ? 'ready' : 'idle'));
  const [pct, setPct] = useState(0);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  async function download() {
    if (doc.size > BIG_FILE_BYTES && !confirm(`Bu dosya ${formatSize(doc.size)}. Büyük dosyalar iPhone belleğini zorlayıp uygulamayı çökertebilir. Yine de indirilsin mi?`)) return;
    setError(''); setNote(''); setPct(0); setStatus('downloading');
    // Keep the screen awake: iOS pauses the download if the app goes to the background.
    let lock: WakeLockSentinel | null = null;
    try { lock = (await navigator.wakeLock?.request('screen')) ?? null; } catch { /* not supported: fine */ }
    try {
      const f = await telegram.download(doc.ref, doc.fileName, doc.mimeType, setPct);
      setFile(f);
      setStatus('ready');
    } catch (e) {
      const m = mapError(e);
      setError(m.message);
      setStatus('idle');
      if (m.action === 'relogin') onRelogin();
    } finally {
      try { await lock?.release(); } catch { /* ignore */ }
    }
  }

  // No `await` before shareFile: see src/share.ts.
  function share() {
    if (!file) return;
    shareFile(file)
      .then((r) => setNote(r === 'downloaded' ? 'Dosya cihaza indirildi.' : ''))
      .catch(() => setError('Paylaşım açılamadı, tekrar deneyin'));
  }

  return (
    <div>
      <button type="button" class="secondary back" onClick={onBack}>← Geri</button>
      <h2 class="filename">{doc.fileName}</h2>
      <p>{doc.chatTitle}<br /><small>{formatDate(doc.date)} · {formatSize(doc.size)}</small></p>

      {status === 'idle' && <button type="button" onClick={download}>İndir</button>}
      {status === 'downloading' && (
        <div>
          <progress value={pct} max={100} />
          <p>%{pct} — Uygulamadan çıkmayın</p>
        </div>
      )}
      {status === 'ready' && <button type="button" onClick={share}>Paylaş</button>}

      {error && <p class="error">{error}</p>}
      {note && <p>{note}</p>}
      {doc.link && <p><a href={doc.link} target="_blank" rel="noopener noreferrer">Telegram'da aç</a></p>}
    </div>
  );
}
