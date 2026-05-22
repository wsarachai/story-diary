export interface EBookChapter {
  id: string;
  title: string;
  pdfUrl: string;
}

export interface EBookCollection {
  badge: string;
  chapters: EBookChapter[];
}
