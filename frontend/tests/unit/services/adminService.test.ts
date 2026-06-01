// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { clearTestData } from "@/lib/db";
import {
  adminListChapters,
  adminCreateChapter,
  adminUpdateChapter,
  adminDeleteChapter,
  adminListEBooks,
  adminCreateEBook,
  adminUpdateEBook,
  adminDeleteEBook,
  adminListQuestions,
  adminCreateQuestion,
  adminUpdateQuestion,
  adminDeleteQuestion,
  adminGetChapter,
  adminListScenes,
  adminCreateScene,
  adminUpdateScene,
  adminDeleteScene,
} from "@/lib/services/adminService";
import { AppError } from "@/lib/errors";

beforeEach(() => {
  clearTestData();
});

// ── Chapters ──────────────────────────────────────────────────────────────────

describe("adminListChapters", () => {
  it("returns all 5 seeded chapters", async () => {
    const chapters = await adminListChapters();
    expect(chapters).toHaveLength(5);
  });

  it("returns chapters with id, title, lockState, and progress fields", async () => {
    const chapters = await adminListChapters();
    const ch = chapters[0];
    expect(ch).toHaveProperty("id");
    expect(ch).toHaveProperty("title");
    expect(ch).toHaveProperty("lockState");
    expect(ch).toHaveProperty("progress");
  });

  it("first chapter is unlocked", async () => {
    const chapters = await adminListChapters();
    expect(chapters[0].lockState).toBe("unlocked");
  });
});

describe("adminCreateChapter", () => {
  it("creates a new chapter and returns it", async () => {
    const ch = await adminCreateChapter({
      title: "New Chapter",
      introTitle: "Intro",
      lockState: "locked",
    });
    expect(ch.title).toBe("New Chapter");
    expect(ch.lockState).toBe("locked");
    expect(typeof ch.id).toBe("number");
  });

  it("new chapter appears in subsequent list", async () => {
    await adminCreateChapter({ title: "Extra", introTitle: "Intro", lockState: "locked" });
    const chapters = await adminListChapters();
    expect(chapters).toHaveLength(6);
    expect(chapters.some((c) => c.title === "Extra")).toBe(true);
  });

  it("assigns auto-incrementing id", async () => {
    const ch1 = await adminCreateChapter({ title: "A", introTitle: "I", lockState: "locked" });
    const ch2 = await adminCreateChapter({ title: "B", introTitle: "I", lockState: "locked" });
    expect(ch2.id).toBeGreaterThan(ch1.id);
  });
});

describe("adminUpdateChapter", () => {
  it("updates an existing chapter title", async () => {
    const updated = await adminUpdateChapter(1, { title: "Updated Title" });
    expect(updated.title).toBe("Updated Title");
    expect(updated.id).toBe(1);
  });

  it("updates lockState", async () => {
    const updated = await adminUpdateChapter(1, { lockState: "locked" });
    expect(updated.lockState).toBe("locked");
  });

  it("throws 404 for non-existent chapter id", async () => {
    await expect(adminUpdateChapter(9999, { title: "X" })).rejects.toMatchObject({
      statusCode: 404,
      code: "CHAPTER_NOT_FOUND",
    });
  });
});

describe("adminDeleteChapter", () => {
  it("removes a chapter from the list", async () => {
    await adminDeleteChapter(1);
    const chapters = await adminListChapters();
    expect(chapters.some((c) => c.id === 1)).toBe(false);
    expect(chapters).toHaveLength(4);
  });

  it("throws 404 for non-existent chapter", async () => {
    await expect(adminDeleteChapter(9999)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ── EBooks ────────────────────────────────────────────────────────────────────

describe("adminListEBooks", () => {
  it("returns all 5 seeded e-books", async () => {
    const books = await adminListEBooks();
    expect(books).toHaveLength(5);
  });

  it("returns ebooks with id, title, pdfUrl", async () => {
    const books = await adminListEBooks();
    expect(books[0]).toHaveProperty("id");
    expect(books[0]).toHaveProperty("title");
    expect(books[0]).toHaveProperty("pdfUrl");
  });
});

describe("adminCreateEBook", () => {
  it("creates an e-book and returns it", async () => {
    const book = await adminCreateEBook({ title: "New Book", pdfUrl: "/books/new.pdf" });
    expect(book.title).toBe("New Book");
    expect(book.pdfUrl).toBe("/books/new.pdf");
    expect(typeof book.id).toBe("string");
  });

  it("new ebook appears in list", async () => {
    await adminCreateEBook({ title: "Extra Book", pdfUrl: "/x.pdf" });
    const books = await adminListEBooks();
    expect(books).toHaveLength(6);
  });
});

describe("adminUpdateEBook", () => {
  it("updates title", async () => {
    const books = await adminListEBooks();
    const id = books[0].id;
    const updated = await adminUpdateEBook(id, { title: "Renamed" });
    expect(updated.title).toBe("Renamed");
  });

  it("throws 404 for missing id", async () => {
    await expect(adminUpdateEBook("no-such-id", { title: "X" })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("adminDeleteEBook", () => {
  it("removes ebook from list", async () => {
    const books = await adminListEBooks();
    const id = books[0].id;
    await adminDeleteEBook(id);
    const after = await adminListEBooks();
    expect(after.some((b) => b.id === id)).toBe(false);
  });

  it("throws 404 for missing id", async () => {
    await expect(adminDeleteEBook("ghost")).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── Quiz Questions ────────────────────────────────────────────────────────────

describe("adminListQuestions", () => {
  it("returns all 13 seeded questions", async () => {
    const qs = await adminListQuestions();
    expect(qs).toHaveLength(13);
  });

  it("questions have expected shape", async () => {
    const qs = await adminListQuestions();
    const q = qs[0];
    expect(q).toHaveProperty("id");
    expect(q).toHaveProperty("number");
    expect(q).toHaveProperty("text");
    expect(q.options).toHaveLength(4);
    expect(q).toHaveProperty("correctAnswer");
  });
});

describe("adminCreateQuestion", () => {
  it("creates a question and returns it", async () => {
    const q = await adminCreateQuestion({
      number: 99,
      text: "Test question?",
      correctAnswer: "A",
      optionA: "Yes",
      optionB: "No",
      optionC: "Maybe",
      optionD: "Never",
    });
    expect(q.number).toBe(99);
    expect(q.text).toBe("Test question?");
    expect(q.correctAnswer).toBe("A");
    expect(q.options[0].text).toBe("Yes");
  });

  it("new question appears in list", async () => {
    await adminCreateQuestion({
      number: 14,
      text: "Extra?",
      correctAnswer: "B",
      optionA: "A", optionB: "B", optionC: "C", optionD: "D",
    });
    const qs = await adminListQuestions();
    expect(qs).toHaveLength(14);
  });
});

describe("adminUpdateQuestion", () => {
  it("updates question text", async () => {
    const qs = await adminListQuestions();
    const id = qs[0].id;
    const updated = await adminUpdateQuestion(id, { text: "Updated text?" });
    expect(updated.text).toBe("Updated text?");
  });

  it("throws 404 for missing id", async () => {
    await expect(adminUpdateQuestion("ghost-id", { text: "X" })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("adminDeleteQuestion", () => {
  it("removes question from list", async () => {
    const qs = await adminListQuestions();
    const id = qs[0].id;
    await adminDeleteQuestion(id);
    const after = await adminListQuestions();
    expect(after.some((q) => q.id === id)).toBe(false);
    expect(after).toHaveLength(12);
  });

  it("throws 404 for missing id", async () => {
    await expect(adminDeleteQuestion("ghost")).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── Chapter Scenes ────────────────────────────────────────────────────────────

describe("adminGetChapter", () => {
  it("returns chapter fields for a valid id", async () => {
    const ch = await adminGetChapter(1);
    expect(ch.id).toBe(1);
    expect(ch.title).toBe("บทที่ 1: เริ่มต้นการเดินทาง");
    expect(ch.scenes).toHaveLength(0);
  });

  it("throws 404 for missing chapter", async () => {
    await expect(adminGetChapter(9999)).rejects.toMatchObject({ statusCode: 404, code: "CHAPTER_NOT_FOUND" });
  });
});

describe("adminListScenes", () => {
  it("returns seeded scenes for chapter 1", async () => {
    const scenes = await adminListScenes(1);
    expect(scenes.length).toBeGreaterThan(0);
    expect(scenes[0]).toHaveProperty("id");
    expect(scenes[0]).toHaveProperty("index");
    expect(scenes[0]).toHaveProperty("speakerName");
    expect(scenes[0]).toHaveProperty("text");
  });

  it("returns empty array for chapter with no scenes", async () => {
    const scenes = await adminListScenes(9999);
    expect(scenes).toHaveLength(0);
  });
});

describe("adminCreateScene", () => {
  it("creates a scene and returns it", async () => {
    const scene = await adminCreateScene(1, {
      idx: 99,
      speakerName: "ทดสอบ",
      speakerImageUrl: "/img/test.png",
      text: "ข้อความทดสอบ",
    });
    expect(scene.index).toBe(99);
    expect(scene.speakerName).toBe("ทดสอบ");
    expect(scene.speakerImageUrl).toBe("/img/test.png");
    expect(scene.text).toBe("ข้อความทดสอบ");
    expect(typeof scene.id).toBe("string");
  });

  it("new scene appears in list", async () => {
    const before = await adminListScenes(1);
    await adminCreateScene(1, { idx: 50, speakerName: "ผู้บรรยาย", text: "เพิ่มใหม่" });
    const after = await adminListScenes(1);
    expect(after.length).toBe(before.length + 1);
  });

  it("throws 404 for non-existent chapter", async () => {
    await expect(
      adminCreateScene(9999, { idx: 0, speakerName: "x", text: "x" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("adminUpdateScene", () => {
  it("updates scene text", async () => {
    const scenes = await adminListScenes(1);
    const id = scenes[0].id;
    const updated = await adminUpdateScene(id, { text: "ข้อความใหม่" });
    expect(updated.text).toBe("ข้อความใหม่");
  });

  it("updates speakerName", async () => {
    const scenes = await adminListScenes(1);
    const id = scenes[0].id;
    const updated = await adminUpdateScene(id, { speakerName: "ชื่อใหม่" });
    expect(updated.speakerName).toBe("ชื่อใหม่");
  });

  it("throws 404 for missing scene", async () => {
    await expect(adminUpdateScene("ghost-id", { text: "x" })).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("adminDeleteScene", () => {
  it("removes scene from list", async () => {
    const scenes = await adminListScenes(1);
    const id = scenes[0].id;
    await adminDeleteScene(id);
    const after = await adminListScenes(1);
    expect(after.some((s) => s.id === id)).toBe(false);
  });

  it("throws 404 for missing scene", async () => {
    await expect(adminDeleteScene("ghost")).rejects.toMatchObject({ statusCode: 404 });
  });
});
