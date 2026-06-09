import { v4 as uuidv4 } from "uuid";
import {
  listChaptersDocs,
  findChapterById,
  getNextChapterId,
  insertChapterDoc,
  updateChapterDoc,
  deleteChapterDoc,
  listEBooksDocs,
  insertEBookDoc,
  updateEBookDoc,
  deleteEBookDoc,
  listQuizQuestionsDocs,
  findQuizQuestionById,
  insertQuizQuestionDoc,
  updateQuizQuestionDoc,
  deleteQuizQuestionDoc,
  reorderQuizQuestionDocs,
  listChapterScenesByChapterId,
  insertChapterSceneDoc,
  updateChapterSceneDoc,
  deleteChapterSceneDoc,
  listAllUsers,
  updateUserDoc,
  listVideoClipsDocs,
  findVideoClipById,
  insertVideoClipDoc,
  updateVideoClipDoc,
  deleteVideoClipDoc,
  reorderVideoClipDocs,
} from "@/lib/db";
import { Errors } from "@/lib/errors";
import type { ChapterSummary, Chapter, ChapterScene } from "@/types/chapters";
import type { EBookChapter } from "@/types/ebook";
import type { QuizQuestion } from "@/types/minigame";
import type {
  CreateChapterRequest,
  UpdateChapterRequest,
  CreateEBookRequest,
  UpdateEBookRequest,
  CreateQuestionRequest,
  UpdateQuestionRequest,
} from "@/store/adminApi";

// ── Chapters ──────────────────────────────────────────────────────────────────

export async function adminListChapters(): Promise<ChapterSummary[]> {
  const rows = await listChaptersDocs();
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    lockState: row.lock_state,
    progress: "not-started" as const,
  }));
}

function chapterDocToModel(row: Awaited<ReturnType<typeof findChapterById>>): Chapter {
  if (!row) throw Errors.notFound("CHAPTER_NOT_FOUND", "Chapter not found");
  return {
    id: row.id,
    title: row.title,
    introTitle: row.intro_title,
    ...(row.background_image_url ? { backgroundImageUrl: row.background_image_url } : {}),
    lockState: row.lock_state,
    progress: "not-started",
    scenes: [],
  };
}

export async function adminCreateChapter(body: CreateChapterRequest): Promise<Chapter> {
  const id = await getNextChapterId();
  const rows = await listChaptersDocs();
  const sortOrder = rows.length + 1;

  await insertChapterDoc({
    id,
    title: body.title,
    intro_title: body.introTitle,
    lock_state: body.lockState,
    background_image_url: body.backgroundImageUrl ?? null,
    sort_order: sortOrder,
  });

  const saved = await findChapterById(id);
  return chapterDocToModel(saved);
}

export async function adminUpdateChapter(id: number, body: UpdateChapterRequest): Promise<Chapter> {
  const existing = await findChapterById(id);
  if (!existing) throw Errors.notFound("CHAPTER_NOT_FOUND", `Chapter ${id} not found`);

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.introTitle !== undefined) patch.intro_title = body.introTitle;
  if (body.lockState !== undefined) patch.lock_state = body.lockState;
  if (body.backgroundImageUrl !== undefined) patch.background_image_url = body.backgroundImageUrl || null;

  const updated = await updateChapterDoc(id, patch as Parameters<typeof updateChapterDoc>[1]);
  return chapterDocToModel(updated);
}

export async function adminDeleteChapter(id: number): Promise<void> {
  const deleted = await deleteChapterDoc(id);
  if (!deleted) throw Errors.notFound("CHAPTER_NOT_FOUND", `Chapter ${id} not found`);
}

// ── Admin: Chapter detail + Scene CRUD ───────────────────────────────────────

export async function adminGetChapter(id: number): Promise<Chapter> {
  const row = await findChapterById(id);
  if (!row) throw Errors.notFound("CHAPTER_NOT_FOUND", `Chapter ${id} not found`);
  return {
    id: row.id,
    title: row.title,
    introTitle: row.intro_title,
    ...(row.background_image_url ? { backgroundImageUrl: row.background_image_url } : {}),
    lockState: row.lock_state,
    progress: "not-started",
    scenes: [],
  };
}

function sceneDocToModel(doc: { id: string; chapter_id: number; idx: number; speaker_name: string; speaker_image_url?: string | null; text: string }): ChapterScene {
  return {
    id: doc.id,
    index: doc.idx,
    speakerName: doc.speaker_name,
    ...(doc.speaker_image_url ? { speakerImageUrl: doc.speaker_image_url } : {}),
    text: doc.text,
  };
}

export async function adminListScenes(chapterId: number): Promise<ChapterScene[]> {
  const rows = await listChapterScenesByChapterId(chapterId);
  return rows.map(sceneDocToModel);
}

export interface CreateSceneRequest {
  idx: number;
  speakerName: string;
  speakerImageUrl?: string;
  text: string;
}

export type UpdateSceneRequest = Partial<CreateSceneRequest>;

export async function adminCreateScene(chapterId: number, body: CreateSceneRequest): Promise<ChapterScene> {
  const chapter = await findChapterById(chapterId);
  if (!chapter) throw Errors.notFound("CHAPTER_NOT_FOUND", `Chapter ${chapterId} not found`);

  const id = `scene-${uuidv4().slice(0, 8)}`;
  await insertChapterSceneDoc({
    id,
    chapter_id: chapterId,
    idx: body.idx,
    speaker_name: body.speakerName,
    speaker_image_url: body.speakerImageUrl ?? null,
    text: body.text,
  });
  return {
    id,
    index: body.idx,
    speakerName: body.speakerName,
    ...(body.speakerImageUrl ? { speakerImageUrl: body.speakerImageUrl } : {}),
    text: body.text,
  };
}

export async function adminUpdateScene(sceneId: string, body: UpdateSceneRequest): Promise<ChapterScene> {
  const patch: Record<string, unknown> = {};
  if (body.idx !== undefined) patch.idx = body.idx;
  if (body.speakerName !== undefined) patch.speaker_name = body.speakerName;
  if (body.speakerImageUrl !== undefined) patch.speaker_image_url = body.speakerImageUrl || null;
  if (body.text !== undefined) patch.text = body.text;

  const updated = await updateChapterSceneDoc(sceneId, patch as Parameters<typeof updateChapterSceneDoc>[1]);
  if (!updated) throw Errors.notFound("SCENE_NOT_FOUND", `Scene ${sceneId} not found`);
  return sceneDocToModel(updated);
}

export async function adminDeleteScene(sceneId: string): Promise<void> {
  const deleted = await deleteChapterSceneDoc(sceneId);
  if (!deleted) throw Errors.notFound("SCENE_NOT_FOUND", `Scene ${sceneId} not found`);
}

// ── EBooks ────────────────────────────────────────────────────────────────────

export async function adminListEBooks(): Promise<EBookChapter[]> {
  const rows = await listEBooksDocs();
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    pdfUrl: row.pdf_url,
  }));
}

export async function adminCreateEBook(body: CreateEBookRequest): Promise<EBookChapter> {
  const id = `ebk-${uuidv4().slice(0, 8)}`;
  await insertEBookDoc({ id, title: body.title, pdf_url: body.pdfUrl });
  return { id, title: body.title, pdfUrl: body.pdfUrl };
}

export async function adminUpdateEBook(id: string, body: UpdateEBookRequest): Promise<EBookChapter> {
  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.pdfUrl !== undefined) patch.pdf_url = body.pdfUrl;

  const updated = await updateEBookDoc(id, patch as Parameters<typeof updateEBookDoc>[1]);
  if (!updated) throw Errors.notFound("EBOOK_NOT_FOUND", `EBook ${id} not found`);
  return { id: updated.id, title: updated.title, pdfUrl: updated.pdf_url };
}

export async function adminDeleteEBook(id: string): Promise<void> {
  const deleted = await deleteEBookDoc(id);
  if (!deleted) throw Errors.notFound("EBOOK_NOT_FOUND", `EBook ${id} not found`);
}

// ── Quiz Questions ────────────────────────────────────────────────────────────

function questionDocToModel(row: NonNullable<Awaited<ReturnType<typeof findQuizQuestionById>>>): QuizQuestion {
  return {
    id: row.id,
    text: row.text,
    options: [
      { letter: "A" as const, text: row.option_a },
      { letter: "B" as const, text: row.option_b },
      { letter: "C" as const, text: row.option_c },
      { letter: "D" as const, text: row.option_d },
    ],
    correctAnswer: row.correct_answer,
    ...(row.explanation ? { explanation: row.explanation } : {}),
  };
}

export async function adminListQuestions(): Promise<QuizQuestion[]> {
  const rows = await listQuizQuestionsDocs();
  return rows.map(questionDocToModel);
}

export async function adminCreateQuestion(body: CreateQuestionRequest): Promise<QuizQuestion> {
  const existing = await listQuizQuestionsDocs();
  const maxSort = existing.reduce((m, q) => Math.max(m, q.sort_order), 0);
  const id = `q-${uuidv4().slice(0, 8)}`;
  await insertQuizQuestionDoc({
    id,
    sort_order: maxSort + 1,
    text: body.text,
    option_a: body.optionA,
    option_b: body.optionB,
    option_c: body.optionC,
    option_d: body.optionD,
    correct_answer: body.correctAnswer,
    explanation: body.explanation ?? null,
  });
  const saved = await findQuizQuestionById(id);
  if (!saved) throw Errors.internal("Failed to create question");
  return questionDocToModel(saved);
}

export async function adminUpdateQuestion(id: string, body: UpdateQuestionRequest): Promise<QuizQuestion> {
  const patch: Record<string, unknown> = {};
  if (body.text !== undefined) patch.text = body.text;
  if (body.optionA !== undefined) patch.option_a = body.optionA;
  if (body.optionB !== undefined) patch.option_b = body.optionB;
  if (body.optionC !== undefined) patch.option_c = body.optionC;
  if (body.optionD !== undefined) patch.option_d = body.optionD;
  if (body.correctAnswer !== undefined) patch.correct_answer = body.correctAnswer;
  if (body.explanation !== undefined) patch.explanation = body.explanation;

  const updated = await updateQuizQuestionDoc(id, patch as Parameters<typeof updateQuizQuestionDoc>[1]);
  if (!updated) throw Errors.notFound("QUESTION_NOT_FOUND", `Question ${id} not found`);
  return questionDocToModel(updated);
}

export async function adminDeleteQuestion(id: string): Promise<void> {
  const deleted = await deleteQuizQuestionDoc(id);
  if (!deleted) throw Errors.notFound("QUESTION_NOT_FOUND", `Question ${id} not found`);
}

export async function adminReorderQuestions(orderedIds: string[]): Promise<void> {
  const existing = await listQuizQuestionsDocs();
  const existingIds = existing.map((q) => q.id);
  const unique = new Set(orderedIds);
  const isPermutation =
    orderedIds.length === existingIds.length &&
    unique.size === orderedIds.length &&
    existingIds.every((id) => unique.has(id));
  if (!isPermutation) {
    throw Errors.validation("Reorder payload must be a permutation of all question ids");
  }
  await reorderQuizQuestionDocs(orderedIds);
}

// ── Video Clips ───────────────────────────────────────────────────────────────

export interface VideoClipModel {
  id: string;
  caption: string;
  sourceUrl: string;
  thumbnailUrl?: string;
  sortOrder: number;
}

export interface CreateVideoClipRequest {
  caption: string;
  sourceUrl: string;
  thumbnailUrl?: string;
}

export type UpdateVideoClipRequest = Partial<CreateVideoClipRequest>;

function clipDocToModel(doc: { id: string; caption: string; source_url: string; thumbnail_url?: string | null; sort_order: number }): VideoClipModel {
  return {
    id: doc.id,
    caption: doc.caption,
    sourceUrl: doc.source_url,
    ...(doc.thumbnail_url ? { thumbnailUrl: doc.thumbnail_url } : {}),
    sortOrder: doc.sort_order,
  };
}

export async function adminListVideoClips(): Promise<VideoClipModel[]> {
  const rows = await listVideoClipsDocs();
  return rows.map(clipDocToModel);
}

export async function adminCreateVideoClip(body: CreateVideoClipRequest): Promise<VideoClipModel> {
  const rows = await listVideoClipsDocs();
  const sortOrder = rows.length + 1;
  const id = `clip-${uuidv4().slice(0, 8)}`;
  await insertVideoClipDoc({
    id,
    caption: body.caption,
    source_url: body.sourceUrl,
    thumbnail_url: body.thumbnailUrl ?? null,
    sort_order: sortOrder,
  });
  const saved = await findVideoClipById(id);
  if (!saved) throw new Error("Failed to create video clip");
  return clipDocToModel(saved);
}

export async function adminUpdateVideoClip(id: string, body: UpdateVideoClipRequest): Promise<VideoClipModel> {
  const patch: Record<string, unknown> = {};
  if (body.caption !== undefined) patch.caption = body.caption;
  if (body.sourceUrl !== undefined) patch.source_url = body.sourceUrl;
  if (body.thumbnailUrl !== undefined) patch.thumbnail_url = body.thumbnailUrl || null;

  const updated = await updateVideoClipDoc(id, patch as Parameters<typeof updateVideoClipDoc>[1]);
  if (!updated) throw Errors.notFound("CLIP_NOT_FOUND", `Video clip ${id} not found`);
  return clipDocToModel(updated);
}

export async function adminDeleteVideoClip(id: string): Promise<void> {
  const deleted = await deleteVideoClipDoc(id);
  if (!deleted) throw Errors.notFound("CLIP_NOT_FOUND", `Video clip ${id} not found`);
}

export async function adminReorderVideoClips(orderedIds: string[]): Promise<void> {
  await reorderVideoClipDocs(orderedIds);
}

// ── User management (rootAdmin only) ────────────────────────────────────────

export interface UserSummary {
  id: string;
  name: string;
  tel: string;
  role: "user" | "admin" | "rootAdmin";
  createdAt: string;
}

export async function adminListUsers(): Promise<UserSummary[]> {
  const rows = await listAllUsers();
  const rootAdminTel = (process.env.ROOT_ADMIN_TEL ?? "").trim();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    tel: row.tel,
    role:
      (rootAdminTel && row.tel === rootAdminTel) || row.role === "rootAdmin"
        ? "rootAdmin"
        : row.role === "admin"
          ? "admin"
          : "user",
    createdAt: row.created_at,
  }));
}

export async function adminChangeUserRole(userId: string, role: "user" | "admin"): Promise<UserSummary> {
  const updated = await updateUserDoc(userId, { role, updated_at: new Date().toISOString() });
  if (!updated) throw Errors.notFound("USER_NOT_FOUND", `User ${userId} not found`);
  return {
    id: updated.id,
    name: updated.name,
    tel: updated.tel,
    role: updated.role === "admin" ? "admin" : "user",
    createdAt: updated.created_at,
  };
}
