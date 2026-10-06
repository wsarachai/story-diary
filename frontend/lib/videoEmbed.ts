const youtubeEmbed = (id: string) =>
  `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
const drivePreview = (id: string) =>
  `https://drive.google.com/file/d/${id}/preview`;

/** YouTube video id from any supported YouTube link, else null. */
export function youtubeVideoId(sourceUrl?: string): string | null {
  if (!sourceUrl) return null;
  try {
    const parsed = new URL(sourceUrl);
    const host = parsed.hostname.toLowerCase();

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return v;

      // watch?v= above; otherwise /shorts/<id>, /embed/<id> and /live/<id>
      // all carry the video id as the first path segment.
      const match = parsed.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
      return match ? match[1] : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function toEmbedUrl(sourceUrl?: string): string {
  if (!sourceUrl) return "";

  const youtubeId = youtubeVideoId(sourceUrl);
  if (youtubeId) return youtubeEmbed(youtubeId);

  try {
    const parsed = new URL(sourceUrl);
    const host = parsed.hostname.toLowerCase();

    if (host === "drive.google.com") {
      const fileMatch = parsed.pathname.match(/^\/file\/d\/([^/]+)(?:\/|$)/);
      if (fileMatch) return drivePreview(fileMatch[1]);

      // Legacy sharing links: drive.google.com/open?id=<id> (also /uc?id=).
      const id = parsed.searchParams.get("id");
      if (id && /^\/(?:open|uc)\/?$/.test(parsed.pathname)) return drivePreview(id);
    }
  } catch {
    return "";
  }

  return "";
}

/**
 * Thumbnail to show for a clip: an explicit image URL when one is set,
 * otherwise YouTube's own still for YouTube links (`hqdefault` exists for
 * every video, unlike `maxresdefault`). A video link pasted into the
 * thumbnail field is ignored rather than rendered as a broken image.
 * Returns undefined when nothing can be shown (e.g. Google Drive with no
 * explicit thumbnail).
 */
export function clipThumbnailUrl(thumbnailUrl?: string, sourceUrl?: string): string | undefined {
  if (thumbnailUrl && !isSupportedVideoUrl(thumbnailUrl)) return thumbnailUrl;
  const id = youtubeVideoId(sourceUrl) ?? youtubeVideoId(thumbnailUrl);
  return id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : undefined;
}

export function isSupportedVideoUrl(sourceUrl: string): boolean {
  return Boolean(toEmbedUrl(sourceUrl));
}
