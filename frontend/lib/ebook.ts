/**
 * E-book PDF constraints shared by the admin upload route, the upload button
 * and the reader — a file larger than this would not be playable through the
 * reader's pdf-proxy anyway.
 */
export const MAX_EBOOK_PDF_BYTES = 50 * 1024 * 1024;

/**
 * True for URLs in a private Vercel Blob store
 * (`https://<storeId>.private.blob.vercel-storage.com/...`). These can't be
 * fetched anonymously — the pdf-proxy reads them with the server Blob token.
 */
export function isPrivateBlobUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname.endsWith(".private.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/**
 * Blob pathname for an uploaded PDF. Non-ASCII runs (e.g. Thai titles) are
 * collapsed, so a name like "หนังสือ.pdf" would reduce to ".pdf" — a dotfile
 * with no extension, which Blob can't type as a PDF. Fall back to "ebook" for
 * the base name and always force the ".pdf" extension.
 */
export function ebookBlobPathname(fileName: string): string {
  const base = fileName
    .replace(/\.pdf$/i, "")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `ebooks/${base || "ebook"}.pdf`;
}
