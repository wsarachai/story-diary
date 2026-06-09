import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { handleError } from "@/lib/api-response";

const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);

    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Only http/https URLs are allowed" }, { status: 400 });
    }

    const upstream = await fetch(url, {
      headers: { Accept: "application/pdf,*/*" },
      // @ts-expect-error — Node fetch supports signal via AbortSignal
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

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
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
