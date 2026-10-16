/**
 * Chapter background registry — the images the admin chapter forms offer for
 * `backgroundImageUrl`. Sources are the 1920×1080 PNGs in the project's
 * Drive folder (`__nurse-projects/images/BG/<n>.png`), re-encoded as WebP
 * (quality 80) into public/images/backgrounds; the `bg-NN` prefix keeps the
 * original number so art can be traced back to its source file.
 */

export interface ChapterBackground {
  url: string;
  /** Thai label shown as the picker tile's tooltip/alt text. */
  label: string;
}

const bg = (n: number, slug: string, label: string): ChapterBackground => ({
  url: `/images/backgrounds/bg-${String(n).padStart(2, "0")}-${slug}-1920x1080.webp`,
  label,
});

export const CHAPTER_BACKGROUNDS: readonly ChapterBackground[] = [
  bg(1, "black", "จอดำ"),
  bg(2, "village", "หมู่บ้าน"),
  bg(3, "village-mist", "หมู่บ้าน (หมอกบาง)"),
  bg(4, "village-mist-heavy", "หมู่บ้าน (หมอกหนา)"),
  bg(5, "market-cloud", "ตลาด (กลุ่มหมอก)"),
  bg(6, "market-mist", "ตลาด (หมอก)"),
  bg(7, "market", "ลานน้ำพุกลางตลาด"),
  bg(8, "gate-mist", "ประตูเมือง (หมอก)"),
  bg(9, "forest-mist", "ป่า (หมอก)"),
  bg(10, "castle-rampart", "กำแพงปราสาท"),
  bg(11, "castle-corridor", "ทางเดินในปราสาท"),
  bg(12, "castle-hall", "โถงในปราสาท"),
  bg(13, "castle-stairs", "บันไดวน"),
  bg(14, "castle-door-stairs", "ประตูข้างบันได"),
  bg(15, "castle-door", "ประตูไม้"),
  bg(16, "castle-door-landing", "ชานพักหน้าประตู"),
  bg(17, "castle-flash", "แสงวาบในปราสาท"),
  bg(18, "white", "จอขาว"),
  // Named renders added to the Drive folder after the numbered set
  // (scripts/process-background-art.py, WebP quality 80, 1920×1080).
  { url: "/images/backgrounds/bg-19-guide-1920x1080.webp", label: "คู่มือ" },
  { url: "/images/backgrounds/bg-20-fairy-1920x1080.webp", label: "ภูติน้อย" },
  { url: "/images/backgrounds/bg-21-notebook-1920x1080.webp", label: "สมุดโน๊ต" },
  { url: "/images/backgrounds/bg-22-notebook-village-1920x1080.webp", label: "สมุดโน๊ตในหมู่บ้าน" },
  { url: "/images/backgrounds/bg-23-goddess-good-1920x1080.webp", label: "เทพีดี" },
  { url: "/images/backgrounds/bg-24-goddess-good-pre-mist-1920x1080.webp", label: "เทพีดี (ก่อนหมอกลง)" },
  { url: "/images/backgrounds/bg-25-goddess-good-hurt-1920x1080.webp", label: "เทพีดี (เจ็บปวด)" },
  { url: "/images/backgrounds/bg-26-goddess-evil-1920x1080.webp", label: "เทพีร้าย" },
];

export function findChapterBackground(url: string | undefined): ChapterBackground | undefined {
  return url ? CHAPTER_BACKGROUNDS.find((b) => b.url === url) : undefined;
}
