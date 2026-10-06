import { describe, it, expect } from "vitest";
import { ebookBlobPathname, isPrivateBlobUrl } from "@/lib/ebook";

describe("ebookBlobPathname", () => {
  it("keeps ASCII names and the .pdf extension", () => {
    expect(ebookBlobPathname("Chapter 1 (final).pdf")).toBe("ebooks/Chapter-1-final.pdf");
  });

  it("falls back to a real base name for all-Thai file names", () => {
    expect(ebookBlobPathname("หนังสือเรียน.pdf")).toBe("ebooks/ebook.pdf");
  });

  it("keeps the ASCII part of mixed Thai/ASCII names", () => {
    expect(ebookBlobPathname("บทที่ 2 unit2.PDF")).toBe("ebooks/2-unit2.pdf");
  });

  it("forces a .pdf extension", () => {
    expect(ebookBlobPathname("notes")).toBe("ebooks/notes.pdf");
    expect(ebookBlobPathname(".pdf")).toBe("ebooks/ebook.pdf");
  });
});

describe("isPrivateBlobUrl", () => {
  it("detects private-store URLs only", () => {
    expect(isPrivateBlobUrl("https://abc.private.blob.vercel-storage.com/ebooks/a.pdf")).toBe(true);
    expect(isPrivateBlobUrl("https://abc.public.blob.vercel-storage.com/ebooks/a.pdf")).toBe(false);
    expect(isPrivateBlobUrl("https://evil.com/x.private.blob.vercel-storage.com/a.pdf")).toBe(false);
    expect(isPrivateBlobUrl("/local.pdf")).toBe(false);
  });
});
