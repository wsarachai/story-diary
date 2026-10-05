import localFont from "next/font/local";

/**
 * Self-hosted copies of the Google Fonts files that next/font/google used to
 * download at build time (that fetch made Vercel builds fail intermittently).
 *
 * Google splits each family into per-script subset files selected by
 * unicode-range, so the browser only downloads the scripts a page uses.
 * next/font/local allows one unicode-range per call, hence one call per
 * subset; globals.css chains them back into --font-noto-sans-thai and
 * --font-baloo2 and appends the size-adjusted Arial fallbacks. Those use the
 * metrics next/font/google generated for the full fonts — computing them from
 * a subset file would drift slightly. Each file is a variable font shared by
 * every weight, mirroring Google's @font-face rules.
 *
 * Licensed under the SIL Open Font License 1.1 (see OFL-*.txt in this folder).
 */

const notoThaiThai = localFont({
  src: [
    { path: "./noto-sans-thai-thai.woff2", weight: "400" },
    { path: "./noto-sans-thai-thai.woff2", weight: "600" },
    { path: "./noto-sans-thai-thai.woff2", weight: "700" },
  ],
  variable: "--font-noto-sans-thai-thai",
  display: "swap",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC" }],
});

const notoThaiLatinExt = localFont({
  src: [
    { path: "./noto-sans-thai-latin-ext.woff2", weight: "400" },
    { path: "./noto-sans-thai-latin-ext.woff2", weight: "600" },
    { path: "./noto-sans-thai-latin-ext.woff2", weight: "700" },
  ],
  variable: "--font-noto-sans-thai-latin-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF" }],
});

const notoThaiLatin = localFont({
  src: [
    { path: "./noto-sans-thai-latin.woff2", weight: "400" },
    { path: "./noto-sans-thai-latin.woff2", weight: "600" },
    { path: "./noto-sans-thai-latin.woff2", weight: "700" },
  ],
  variable: "--font-noto-sans-thai-latin",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

const baloo2Devanagari = localFont({
  src: [
    { path: "./baloo2-devanagari.woff2", weight: "600" },
    { path: "./baloo2-devanagari.woff2", weight: "700" },
  ],
  variable: "--font-baloo2-devanagari",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B09" }],
});

const baloo2Vietnamese = localFont({
  src: [
    { path: "./baloo2-vietnamese.woff2", weight: "600" },
    { path: "./baloo2-vietnamese.woff2", weight: "700" },
  ],
  variable: "--font-baloo2-vietnamese",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB" }],
});

const baloo2LatinExt = localFont({
  src: [
    { path: "./baloo2-latin-ext.woff2", weight: "600" },
    { path: "./baloo2-latin-ext.woff2", weight: "700" },
  ],
  variable: "--font-baloo2-latin-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF" }],
});

const baloo2Latin = localFont({
  src: [
    { path: "./baloo2-latin.woff2", weight: "600" },
    { path: "./baloo2-latin.woff2", weight: "700" },
  ],
  variable: "--font-baloo2-latin",
  display: "swap",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

/** Class names that define every per-subset CSS variable; apply on <html>. */
export const fontVariables = [
  notoThaiThai,
  notoThaiLatinExt,
  notoThaiLatin,
  baloo2Devanagari,
  baloo2Vietnamese,
  baloo2LatinExt,
  baloo2Latin,
]
  .map((font) => font.variable)
  .join(" ");
