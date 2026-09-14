export function toEmbedUrl(sourceUrl?: string): string {
  if (!sourceUrl) return "";

  try {
    const parsed = new URL(sourceUrl);
    const host = parsed.hostname.toLowerCase();

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : "";
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : "";
    }

    if (host === "drive.google.com") {
      const match = parsed.pathname.match(/^\/file\/d\/([^/]+)(?:\/|$)/);
      return match ? `https://drive.google.com/file/d/${match[1]}/preview` : "";
    }
  } catch {
    return "";
  }

  return "";
}

export function isSupportedVideoUrl(sourceUrl: string): boolean {
  return Boolean(toEmbedUrl(sourceUrl));
}
