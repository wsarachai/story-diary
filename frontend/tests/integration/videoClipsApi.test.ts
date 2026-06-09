/**
 * Video Clips admin API integration tests — Story Diary
 *
 * Verifies the RTK Query ↔ MSW contract for all admin video-clip endpoints:
 *  1. GET  /api/admin/video-clips        → list
 *  2. POST /api/admin/video-clips        → create
 *  3. PATCH /api/admin/video-clips/:id   → update
 *  4. DELETE /api/admin/video-clips/:id  → delete
 *  5. PUT /api/admin/video-clips/reorder → reorder (verifies persistence via subsequent GET)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "@/store/apiSlice";
import { adminApi } from "@/store/adminApi";
import type { VideoClipModel } from "@/store/adminApi";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";

function createTestStore() {
  return configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (gdm) =>
      gdm({ serializableCheck: false, immutableCheck: false }).concat(
        apiSlice.middleware
      ),
  });
}

const CLIP_1: VideoClipModel = { id: "clip-1", caption: "คลิป 1", sourceUrl: "https://yt.com/v1", sortOrder: 1 };
const CLIP_2: VideoClipModel = { id: "clip-2", caption: "คลิป 2", sourceUrl: "https://yt.com/v2", sortOrder: 2 };
const CLIP_3: VideoClipModel = { id: "clip-3", caption: "คลิป 3", sourceUrl: "https://yt.com/v3", sortOrder: 3 };

const SEED_CLIPS = [CLIP_1, CLIP_2, CLIP_3];

describe("Video Clips Admin API Integration", () => {
  beforeEach(() => {
    localStorage.setItem("auth_token", "test-admin-token");
  });

  // ── 1. List ────────────────────────────────────────────────────────────────

  it("getAdminVideoClips returns the list from GET /api/admin/video-clips", async () => {
    server.use(
      http.get("/api/admin/video-clips", () =>
        HttpResponse.json({ clips: SEED_CLIPS })
      )
    );

    const store = createTestStore();
    const result = await store
      .dispatch(adminApi.endpoints.getAdminVideoClips.initiate())
      .unwrap();

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("clip-1");
    expect(result[0].caption).toBe("คลิป 1");
    expect(result[0].sourceUrl).toBe("https://yt.com/v1");
    expect(result[0].sortOrder).toBe(1);
  });

  // ── 2. Create ──────────────────────────────────────────────────────────────

  it("createVideoClip posts to /api/admin/video-clips and returns the new clip", async () => {
    const NEW_CLIP: VideoClipModel = {
      id: "clip-new",
      caption: "คลิปใหม่",
      sourceUrl: "https://yt.com/new",
      sortOrder: 4,
    };

    let capturedBody: unknown;
    server.use(
      http.post("/api/admin/video-clips", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(NEW_CLIP, { status: 201 });
      })
    );

    const store = createTestStore();
    const result = await store
      .dispatch(
        adminApi.endpoints.createVideoClip.initiate({
          caption: "คลิปใหม่",
          sourceUrl: "https://yt.com/new",
        })
      )
      .unwrap();

    expect(result.id).toBe("clip-new");
    expect(result.caption).toBe("คลิปใหม่");
    expect(capturedBody).toMatchObject({ caption: "คลิปใหม่", sourceUrl: "https://yt.com/new" });
  });

  it("createVideoClip includes optional thumbnailUrl in request body", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("/api/admin/video-clips", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(
          { id: "clip-t", caption: "With Thumb", sourceUrl: "https://x.com/v.mp4", thumbnailUrl: "https://x.com/t.jpg", sortOrder: 1 },
          { status: 201 }
        );
      })
    );

    const store = createTestStore();
    await store
      .dispatch(
        adminApi.endpoints.createVideoClip.initiate({
          caption: "With Thumb",
          sourceUrl: "https://x.com/v.mp4",
          thumbnailUrl: "https://x.com/t.jpg",
        })
      )
      .unwrap();

    expect(capturedBody).toMatchObject({ thumbnailUrl: "https://x.com/t.jpg" });
  });

  // ── 3. Update ──────────────────────────────────────────────────────────────

  it("updateVideoClip sends PATCH to /api/admin/video-clips/:id with updated fields", async () => {
    const UPDATED: VideoClipModel = { ...CLIP_1, caption: "ชื่อใหม่" };
    let capturedBody: unknown;

    server.use(
      http.patch("/api/admin/video-clips/:id", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(UPDATED);
      })
    );

    const store = createTestStore();
    const result = await store
      .dispatch(
        adminApi.endpoints.updateVideoClip.initiate({
          id: "clip-1",
          body: { caption: "ชื่อใหม่" },
        })
      )
      .unwrap();

    expect(result.caption).toBe("ชื่อใหม่");
    expect(result.id).toBe("clip-1");
    expect(capturedBody).toMatchObject({ caption: "ชื่อใหม่" });
  });

  // ── 4. Delete ──────────────────────────────────────────────────────────────

  it("deleteVideoClip sends DELETE to /api/admin/video-clips/:id", async () => {
    let deletedId = "";

    server.use(
      http.delete("/api/admin/video-clips/:id", ({ params }) => {
        deletedId = params.id as string;
        return HttpResponse.json({ success: true });
      })
    );

    const store = createTestStore();
    await store
      .dispatch(adminApi.endpoints.deleteVideoClip.initiate("clip-2"))
      .unwrap();

    expect(deletedId).toBe("clip-2");
  });

  // ── 5. Reorder (with persistence) ─────────────────────────────────────────

  it("reorderVideoClips sends PUT to /api/admin/video-clips/reorder with ordered ids", async () => {
    let capturedIds: string[] = [];

    server.use(
      http.put("/api/admin/video-clips/reorder", async ({ request }) => {
        const body = await request.json() as { ids: string[] };
        capturedIds = body.ids;
        return HttpResponse.json({ success: true });
      })
    );

    const store = createTestStore();
    await store
      .dispatch(
        adminApi.endpoints.reorderVideoClips.initiate(["clip-3", "clip-1", "clip-2"])
      )
      .unwrap();

    expect(capturedIds).toEqual(["clip-3", "clip-1", "clip-2"]);
  });

  it("subsequent GET after reorder returns clips in the new order", async () => {
    const reorderedClips: VideoClipModel[] = [
      { ...CLIP_3, sortOrder: 1 },
      { ...CLIP_1, sortOrder: 2 },
      { ...CLIP_2, sortOrder: 3 },
    ];

    server.use(
      http.put("/api/admin/video-clips/reorder", () =>
        HttpResponse.json({ success: true })
      ),
      http.get("/api/admin/video-clips", () =>
        HttpResponse.json({ clips: reorderedClips })
      )
    );

    const store = createTestStore();

    await store
      .dispatch(
        adminApi.endpoints.reorderVideoClips.initiate(["clip-3", "clip-1", "clip-2"])
      )
      .unwrap();

    // invalidatesTags forces a fresh GET on the next query
    const listResult = await store
      .dispatch(adminApi.endpoints.getAdminVideoClips.initiate(undefined, { forceRefetch: true }))
      .unwrap();

    expect(listResult[0].id).toBe("clip-3");
    expect(listResult[1].id).toBe("clip-1");
    expect(listResult[2].id).toBe("clip-2");
  });
});
