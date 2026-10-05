import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ requireAuth: () => "u1" }));
vi.mock("dns/promises", () => ({ default: { lookup: async () => [{ address: "93.184.216.34", family: 4 }] } }));

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
