/**
 * E-book PDF constraints shared by the admin upload route, the upload button
 * and the reader — a file larger than this would not be playable through the
 * reader's pdf-proxy anyway.
 */
export const MAX_EBOOK_PDF_BYTES = 50 * 1024 * 1024;
