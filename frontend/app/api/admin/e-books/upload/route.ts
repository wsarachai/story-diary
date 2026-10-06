import { type NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "@/lib/api-auth";
import { handleError } from "@/lib/api-response";
import { MAX_EBOOK_PDF_BYTES } from "@/lib/ebook";

/**
 * Client-upload bridge for Vercel Blob: the browser asks this route for a
 * short-lived upload token, then PUTs the PDF straight to Blob storage
 * (bypassing the 4.5 MB function body limit). The completion callback from
 * Blob's servers hits this same route and is verified by `handleUpload`
 * itself, so only the token request is admin-gated.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HandleUploadBody;
    if (body.type !== "blob.upload-completed") {
      await requireAdmin(req);
    }
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["application/pdf"],
        maximumSizeInBytes: MAX_EBOOK_PDF_BYTES,
        // Random suffix keeps re-uploads of the same title from clobbering
        // e-books that already reference the old URL.
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // Nothing to persist: the client receives blob.url and still submits
        // the e-book form, so the admin can review before saving.
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    return handleError(err);
  }
}
