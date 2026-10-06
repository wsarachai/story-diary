/**
 * Typewriter pacing for chapter scenes. ~40 reveals per second matches the
 * default text speed of typical story games.
 */
export const TYPEWRITER_SPEED_MS = 25;

/**
 * String offsets at which the typewriter may stop: the end of each grapheme
 * cluster. Thai vowel and tone marks are separate code units (e.g. "ที่" is
 * three), so slicing per code unit would flash bare consonants before their
 * marks appear; stepping per cluster reveals each syllable piece whole.
 * Returns [] for empty text; the last entry is always `text.length`.
 */
export function typewriterStops(text: string): number[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("th", { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (s) => s.index + s.segment.length);
  }
  // Fallback: per code point (keeps surrogate pairs intact).
  const stops: number[] = [];
  let offset = 0;
  for (const ch of text) {
    offset += ch.length;
    stops.push(offset);
  }
  return stops;
}
