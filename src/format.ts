// Display helpers (pure, unit-tested).

// 1 MB = 1024 * 1024 bytes. Turkish decimal comma: "4,2 MB".
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// GramJS reports progress as (downloaded, total) big integers; we only need a 0-100 number.
export function toPercent(downloaded: { toString(): string }, total: { toString(): string }): number {
  const t = Number(total.toString());
  if (!t) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(downloaded.toString()) / t) * 100)));
}

// Above this the whole file in iPhone RAM may crash the tab (ARCHITECTURE.md §5.1).
export const BIG_FILE_BYTES = 150 * 1024 * 1024;

// Unix seconds -> "gg.aa.yyyy" in the phone's local time.
export function formatDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

const EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/zip': '.zip',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'text/plain': '.txt',
};

// Used when a Telegram document has no file name attribute.
export function fallbackFileName(msgId: number, mimeType: string): string {
  return `telegram_${msgId}${EXT[mimeType] ?? ''}`;
}
