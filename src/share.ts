// Opens the iOS share sheet (Gmail, Mail, Files...) for an already downloaded file.
//
// RULE (ARCHITECTURE.md D6): call this straight from the "Paylaş" click handler,
// with NO `await` before it. iOS only allows navigator.share() right after a fresh
// tap; after a long download that tap has expired and share() would fail.
export async function shareFile(file: File): Promise<'shared' | 'cancelled' | 'downloaded'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return 'shared';
    } catch (e) {
      // The user closing the sheet is not an error.
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
      throw e;
    }
  }
  // Fallback for browsers without file sharing (e.g. desktop): save the file instead.
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
