import { type NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";
import { isIP } from "net";
import { requireAuth } from "@/lib/api-auth";
import { handleError } from "@/lib/api-response";
import { Errors } from "@/lib/errors";

const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Block requests to internal/private targets so an authenticated user cannot
 * turn this proxy into an SSRF probe (cloud metadata, localhost services,
 * RFC1918 networks). IPv4-mapped and reserved ranges included.
 */
function isPrivateAddress(ip: string): boolean {
  if (ip === "::" || ip === "::1") return true;
  const lower = ip.toLowerCase();
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7));

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    // Not dotted-quad IPv4 — treat other IPv6 forms as public.
    return false;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

async function assertTargetIsPublic(hostname: string): Promise<void> {
  const badTarget = () => Errors.validation("URL target is not allowed");
  const bare = hostname.replace(/^\[|\]$/g, "");
  if (isIP(bare)) {
    if (isPrivateAddress(bare)) throw badTarget();
    return;
  }
  const records = await dns.lookup(bare, { all: true }).catch(() => []);
  if (records.length === 0) throw badTarget();
  for (const { address } of records) {
    if (isPrivateAddress(address)) throw badTarget();
  }
  // NOTE: TOCTOU via DNS rebinding is a residual risk at this trust level.
}

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);

    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    let targetUrl = url;
    if (url.startsWith("/")) {
      targetUrl = `${req.nextUrl.origin}${url}`;
    }

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Only http/https URLs are allowed" }, { status: 400 });
    }

    await assertTargetIsPublic(parsed.hostname);

    // redirect: "error" — a redirect could otherwise bypass the private-target
    // check above by hopping to an internal address.
    const upstream = await fetch(targetUrl, {
      headers: {
        Accept: "application/pdf,*/*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });

    if (!upstream.ok) {
      return new NextResponse(null, { status: 404 });
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.includes("pdf")) {
      return new NextResponse(null, { status: 404 });
    }

    const contentLength = upstream.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDF too large" }, { status: 413 });
    }

    if (!upstream.body) {
      return new NextResponse(null, { status: 404 });
    }

    // Stream straight through instead of buffering up to 50 MB per request.
    // The byte counter enforces the cap for responses without Content-Length;
    // past that point headers are already sent, so the stream is aborted.
    let received = 0;
    const capped = upstream.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          received += chunk.byteLength;
          if (received > MAX_PDF_BYTES) {
            controller.error(new Error("PDF too large"));
            return;
          }
          controller.enqueue(chunk);
        },
      })
    );

    return new NextResponse(capped, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
