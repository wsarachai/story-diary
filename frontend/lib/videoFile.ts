/**
 * Uploaded video file constraints shared by the admin upload route and the
 * upload dropzone — a file larger than this is rejected before any bytes
 * leave the browser.
 */
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

/**
 * Browser-playable video extensions and their canonical MIME types. The MIME
 * sent to Blob is derived from the extension, never from the File object, so
 * it always matches the upload route's `allowedContentTypes` even when the
 * OS reports an empty or exotic type.
 */
const VIDEO_MIME_BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  ogg: "video/ogg",
};

/** Content types accepted by the video upload route, in extension order. */
export const VIDEO_CONTENT_TYPES = Object.values(VIDEO_MIME_BY_EXTENSION);

/** Canonical MIME for an uploaded video file, or null when unsupported. */
export function videoContentType(fileName: string): string | null {
  const ext = fileName.toLowerCase().match(/\.(\w+)$/)?.[1] ?? "";
  return VIDEO_MIME_BY_EXTENSION[ext] ?? null;
}

/**
 * Blob pathname for an uploaded video. Mirrors ebookBlobPathname: non-ASCII
 * runs (e.g. Thai captions) are collapsed into dashes, so "คลิปสอน.mp4"
 * would reduce to ".mp4" — a dotfile Blob can't type. Fall back to "clip"
 * for the base name and force a supported extension.
 */
export function videoBlobPathname(fileName: string): string {
  const ext = fileName.toLowerCase().match(/\.(mp4|webm|ogg)$/)?.[1] ?? "mp4";
  const base = fileName
    .replace(/\.(mp4|webm|ogg)$/i, "")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `videos/${base || "clip"}.${ext}`;
}

/**
 * True for URLs in a public Vercel Blob store
 * (`https://<storeId>.public.blob.vercel-storage.com/...`). Unlike the
 * private e-book store, these can be fetched by the browser directly, so
 * `<video>` can play them without a proxy.
 */
export function isPublicBlobUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}
