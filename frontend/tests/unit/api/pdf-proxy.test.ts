import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ requireAuth: () => "u1" }));
vi.mock("dns/promises", () => ({ default: { lookup: async () => [{ address: "93.184.216.34", family: 4 }] } }));
const blobGet = vi.fn();
vi.mock("@vercel/blob", () => ({ get: (...args: unknown[]) => blobGet(...args) }));

import { GET } from "@/app/api/pdf-proxy/route";

function upstream(chunks: Uint8Array[], headers: Record<string, string> = {}) {
  const body = new ReadableStream<Uint8Array>({
    start(c) { chunks.forEach((ch) => c.enqueue(ch)); c.close(); },
  });
  return new Response(body, { status: 200, headers: { "content-type": "application/pdf", ...headers } });
}

const req = () => new NextRequest("http://localhost/api/pdf-proxy?url=https://example.com/a.pdf");

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/pdf-proxy streaming", () => {
  it("streams the body through unchanged", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => upstream([new Uint8Array([1, 2]), new Uint8Array([3])])));
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([1, 2, 3]);
  });

  it("aborts the stream once the cap is exceeded without content-length", async () => {
    const big = new Uint8Array(30 * 1024 * 1024);
    vi.stubGlobal("fetch", vi.fn(async () => upstream([big, big])));
    const res = await GET(req());
    await expect(res.arrayBuffer()).rejects.toThrow();
  });

  it("returns 413 up front when content-length is too large", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => upstream([], { "content-length": String(60 * 1024 * 1024) })));
    const res = await GET(req());
    expect(res.status).toBe(413);
  });
});

describe("GET /api/pdf-proxy private Blob store", () => {
  const PRIVATE_URL = "https://abc123.private.blob.vercel-storage.com/ebooks/a-xyz.pdf";
  const privReq = () => new NextRequest(`http://localhost/api/pdf-proxy?url=${encodeURIComponent(PRIVATE_URL)}`);
  const stream = (bytes: number[]) => new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array(bytes)); c.close(); } });

  afterEach(() => blobGet.mockReset());

  it("reads private blobs with the SDK instead of an anonymous fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    blobGet.mockResolvedValue({ statusCode: 200, stream: stream([7, 8]), blob: { contentType: "application/pdf", size: 2 } });
    const res = await GET(privReq());
    expect(res.status).toBe(200);
    expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([7, 8]);
    expect(blobGet).toHaveBeenCalledWith(PRIVATE_URL, expect.objectContaining({ access: "private" }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 404 when the private blob is missing", async () => {
    blobGet.mockResolvedValue(null);
    expect((await GET(privReq())).status).toBe(404);
  });

  it("returns 404 for a non-PDF private blob", async () => {
    blobGet.mockResolvedValue({ statusCode: 200, stream: stream([1]), blob: { contentType: "text/html", size: 1 } });
    expect((await GET(privReq())).status).toBe(404);
  });

  it("returns 413 for an oversized private blob", async () => {
    blobGet.mockResolvedValue({ statusCode: 200, stream: stream([1]), blob: { contentType: "application/pdf", size: 60 * 1024 * 1024 } });
    expect((await GET(privReq())).status).toBe(413);
  });
});
