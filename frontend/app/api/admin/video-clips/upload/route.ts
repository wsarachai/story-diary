import { type NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "@/lib/api-auth";
import { handleError } from "@/lib/api-response";
import { Errors } from "@/lib/errors";
import { MAX_VIDEO_BYTES, VIDEO_CONTENT_TYPES } from "@/lib/videoFile";

/**
 * Client-upload bridge for video clips' public Vercel Blob store: the
 * browser asks this route for a short-lived upload token, then PUTs the
 * video straight to Blob storage (bypassing the 4.5 MB function body
 * limit). The completion callback from Blob's servers hits this same route
 * and is verified by `handleUpload` itself, so only the token request is
 * admin-gated.
 *
 * `VIDEO_BLOB_READ_WRITE_TOKEN` must point at the *public* store. The
 * default `BLOB_READ_WRITE_TOKEN` belongs to the private e-book store,
 * whose "public" PUTs stall on a CORS-less 503 that the SDK silently
 * retries — failing fast here turns that misconfiguration into an
 * immediate, visible error.
 *
 * `onUploadCompleted` is intentionally omitted (same reasoning as the
 * e-book upload route): the client receives the blob URL directly and
 * persists it through the video clip form.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HandleUploadBody;
    if (body.type !== "blob.upload-completed") {
      await requireAdmin(req);
    }
    const token = process.env.VIDEO_BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw Errors.internal("VIDEO_BLOB_READ_WRITE_TOKEN is not configured");
    }
    const json = await handleUpload({
      body,
      request: req,
      token,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: VIDEO_CONTENT_TYPES,
        maximumSizeInBytes: MAX_VIDEO_BYTES,
        // Random suffix keeps re-uploads of the same file name from
        // clobbering clips that already reference the old URL.
        addRandomSuffix: true,
      }),
    });
    return NextResponse.json(json);
  } catch (err) {
    return handleError(err);
  }
}
