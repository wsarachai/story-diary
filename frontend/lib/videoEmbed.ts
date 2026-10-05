const youtubeEmbed = (id: string) =>
  `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
const drivePreview = (id: string) =>
  `https://drive.google.com/file/d/${id}/preview`;

export function toEmbedUrl(sourceUrl?: string): string {
  if (!sourceUrl) return "";

  try {
    const parsed = new URL(sourceUrl);
    const host = parsed.hostname.toLowerCase();

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? youtubeEmbed(id) : "";
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return youtubeEmbed(v);

      // watch?v= above; otherwise /shorts/<id>, /embed/<id> and /live/<id>
      // all carry the video id as the first path segment.
      const match = parsed.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
      return match ? youtubeEmbed(match[1]) : "";
    }

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

export function isSupportedVideoUrl(sourceUrl: string): boolean {
  return Boolean(toEmbedUrl(sourceUrl));
}
