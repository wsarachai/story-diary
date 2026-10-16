import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { MAX_VIDEO_BYTES } from "@/lib/videoFile";

vi.mock("@/lib/api-auth", () => ({ requireAdmin: vi.fn(async () => "admin1") }));
const handleUpload = vi.fn();
vi.mock("@vercel/blob/client", () => ({ handleUpload: (...args: unknown[]) => handleUpload(...args) }));

import { POST } from "@/app/api/admin/video-clips/upload/route";
import { requireAdmin } from "@/lib/api-auth";

const mockedRequireAdmin = vi.mocked(requireAdmin);

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/video-clips/upload", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", authorization: "Bearer jwt" },
  });
}

const TOKEN_EVENT = {
  type: "blob.generate-client-token",
  payload: { pathname: "videos/clip-a1b2.mp4", callback: "/api/admin/video-clips/upload", clientPayload: null, multipart: false },
};

beforeEach(() => {
  mockedRequireAdmin.mockClear();
  handleUpload.mockReset();
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/admin/video-clips/upload", () => {
  it("rejects the token request when the admin guard fails", async () => {
    mockedRequireAdmin.mockRejectedValueOnce(new AppError(403, "FORBIDDEN", "Access denied"));
    const res = await POST(postRequest(TOKEN_EVENT));
    expect(res.status).toBe(403);
    expect(handleUpload).not.toHaveBeenCalled();
  });

  it("returns 500 when the public-store token env is missing", async () => {
    vi.stubEnv("VIDEO_BLOB_READ_WRITE_TOKEN", "");
    const res = await POST(postRequest(TOKEN_EVENT));
    expect(res.status).toBe(500);
    expect(handleUpload).not.toHaveBeenCalled();
  });

  it("generates a token with the public store's token and video constraints", async () => {
    vi.stubEnv("VIDEO_BLOB_READ_WRITE_TOKEN", "public-store-token");
    handleUpload.mockResolvedValue({ type: "blob.generate-client-token", clientToken: "tok" });
    const res = await POST(postRequest(TOKEN_EVENT));
    await expect(res.json()).resolves.toEqual({ type: "blob.generate-client-token", clientToken: "tok" });
    expect(mockedRequireAdmin).toHaveBeenCalledTimes(1);
    expect(handleUpload).toHaveBeenCalledWith(
      expect.objectContaining({ body: TOKEN_EVENT, token: "public-store-token" }),
    );
    const opts = handleUpload.mock.calls[0][0] as {
      onBeforeGenerateToken: (pathname: string, clientPayload: string | null, multipart: boolean) => Promise<unknown>;
    };
    await expect(opts.onBeforeGenerateToken("videos/clip-a1b2.mp4", null, false)).resolves.toEqual({
      allowedContentTypes: ["video/mp4", "video/webm", "video/ogg"],
      maximumSizeInBytes: MAX_VIDEO_BYTES,
      addRandomSuffix: true,
    });
  });

  it("does not admin-gate Blob's upload-completed callback", async () => {
    vi.stubEnv("VIDEO_BLOB_READ_WRITE_TOKEN", "public-store-token");
    const completed = { type: "blob.upload-completed", payload: { blob: { url: "https://x.public.blob.vercel-storage.com/videos/a.mp4" } } };
    handleUpload.mockResolvedValue({ type: "blob.upload-completed", response: "ok" });
    const res = await POST(postRequest(completed));
    await expect(res.json()).resolves.toEqual({ type: "blob.upload-completed", response: "ok" });
    expect(mockedRequireAdmin).not.toHaveBeenCalled();
    expect(handleUpload).toHaveBeenCalledWith(expect.objectContaining({ body: completed }));
  });
});
