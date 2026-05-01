import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { Chapter, ChapterId, ChapterSummary } from "@/types/chapters";

interface ChaptersState {
  summaries: ChapterSummary[];
  byId: Record<string, Chapter | undefined>;
  summariesStatus: "idle" | "loading" | "ready" | "error";
  detailStatus: Record<string, "idle" | "loading" | "ready" | "error">;
  lockHintFor: ChapterId | null;
}

const MOCK_SUMMARIES: ChapterSummary[] = [
  { id: 1, title: "บทที่ 1: เริ่มต้นการเดินทาง", lockState: "unlocked", progress: "not-started" },
  { id: 2, title: "บทที่ 2: การเรียนรู้", lockState: "locked", progress: "not-started" },
  { id: 3, title: "บทที่ 3: ความท้าทาย", lockState: "locked", progress: "not-started" },
  { id: 4, title: "บทที่ 4: การเติบโต", lockState: "locked", progress: "not-started" },
  { id: 5, title: "บทที่ 5: บทสรุป", lockState: "locked", progress: "not-started" },
];

const MOCK_CHAPTERS: Record<number, Chapter> = {
  1: {
    id: 1,
    title: "บทที่ 1: เริ่มต้นการเดินทาง",
    introTitle: "บทบรรยาย",
    backgroundImageUrl: "/images/chapters-explain-bg-1920x1080.svg",
    lockState: "unlocked",
    progress: "not-started",
    scenes: [
      {
        id: "c1s0",
        index: 0,
        speakerName: "ผู้บรรยาย",
        text: "ยินดีต้อนรับสู่ Story Diary — บันทึกการเดินทางสุขภาพของคุณ\nวันนี้เราจะเริ่มต้นก้าวแรกด้วยกัน",
      },
      {
        id: "c1s1",
        index: 1,
        speakerName: "ชื่อตัวละคร",
        speakerImageUrl: "/images/chapter-speaker-girl-transparent.png",
        text: "สวัสดี! ฉันชื่อ... ยังไม่รู้จะตั้งชื่ออะไรดี แต่ฉันพร้อมแล้วที่จะดูแลสุขภาพ",
      },
      {
        id: "c1s2",
        index: 2,
        speakerName: "ผู้บรรยาย",
        text: "การดูแลสุขภาพไม่ใช่เรื่องยาก เพียงแค่เริ่มต้นทีละก้าว\nบันทึกกิจกรรมประจำวัน ติดตามความก้าวหน้า และสนุกกับการเรียนรู้",
      },
      {
        id: "c1s3",
        index: 3,
        speakerName: "ชื่อตัวละคร",
        speakerImageUrl: "/images/chapter-speaker-girl-transparent.png",
        text: "ฉันจะลองดู! เริ่มจากการบันทึกยาที่ต้องทานและอาหารในแต่ละวัน",
      },
      {
        id: "c1s4",
        index: 4,
        speakerName: "ผู้บรรยาย",
        text: "ยอดเยี่ยมมาก! ไปดูกันเลยว่ามีอะไรรออยู่บ้างในการเดินทางครั้งนี้",
      },
    ],
  },
  2: {
    id: 2,
    title: "บทที่ 2: การเรียนรู้",
    introTitle: "บทบรรยาย",
    backgroundImageUrl: "/images/chapters-explain-bg-1920x1080.svg",
    lockState: "locked",
    progress: "not-started",
    scenes: [
      {
        id: "c2s0",
        index: 0,
        speakerName: "ผู้บรรยาย",
        text: "บทเรียนใหม่กำลังเริ่มต้นขึ้น — วันนี้เราจะเรียนรู้ว่าร่างกายทำงานอย่างไร",
      },
      {
        id: "c2s1",
        index: 1,
        speakerName: "ชื่อตัวละคร",
        speakerImageUrl: "/images/chapter-speaker-girl-transparent.png",
        text: "ฉันอยากเข้าใจร่างกายของตัวเองให้มากขึ้น ทำไมบางวันถึงรู้สึกอ่อนเพลีย?",
      },
      {
        id: "c2s2",
        index: 2,
        speakerName: "ผู้บรรยาย",
        text: "ความรู้ที่ถูกต้องช่วยให้การตัดสินใจง่ายขึ้น\nการรู้ว่าอาหารแต่ละประเภทมีผลต่อร่างกายอย่างไรคือก้าวสำคัญ",
      },
      {
        id: "c2s3",
        index: 3,
        speakerName: "ชื่อตัวละคร",
        speakerImageUrl: "/images/chapter-speaker-girl-transparent.png",
        text: "ถ้าฉันฝึกสม่ำเสมอและบันทึกทุกวัน ฉันจะดูแลตัวเองได้ดีขึ้นแน่นอน",
      },
      {
        id: "c2s4",
        index: 4,
        speakerName: "ผู้บรรยาย",
        text: "ทุกคำตอบที่ค้นพบจะกลายเป็นพลังใจ\nการเรียนรู้ไม่มีวันสิ้นสุด",
      },
    ],
  },
  3: {
    id: 3,
    title: "บทที่ 3: ความท้าทาย",
    introTitle: "บทบรรยาย",
    backgroundImageUrl: "/images/chapters-explain-bg-1920x1080.svg",
    lockState: "locked",
    progress: "not-started",
    scenes: [
      {
        id: "c3s0",
        index: 0,
        speakerName: "ผู้บรรยาย",
        text: "เส้นทางนี้ไม่ได้ราบรื่นเสมอไป — ความท้าทายคือส่วนหนึ่งของการเติบโต",
      },
      {
        id: "c3s1",
        index: 1,
        speakerName: "ชื่อตัวละคร",
        speakerImageUrl: "/images/chapter-speaker-girl-transparent.png",
        text: "บางวันฉันก็รู้สึกเหนื่อยและไม่มั่นใจ อยากเลิกทำทุกอย่างเลย",
      },
      {
        id: "c3s2",
        index: 2,
        speakerName: "ผู้บรรยาย",
        text: "ความท้าทายคือบททดสอบของความตั้งใจ\nทุกคนล้มได้ แต่สิ่งสำคัญคือการลุกขึ้นมาใหม่",
      },
      {
        id: "c3s3",
        index: 3,
        speakerName: "ชื่อตัวละคร",
        speakerImageUrl: "/images/chapter-speaker-girl-transparent.png",
        text: "ฉันจะไม่ยอมแพ้ให้กับอุปสรรคเล็ก ๆ\nฉันจะจดบันทึกทุกวันไม่ว่าจะรู้สึกอย่างไร",
      },
      {
        id: "c3s4",
        index: 4,
        speakerName: "ผู้บรรยาย",
        text: "เมื่อก้าวผ่านได้ เราจะเห็นตัวเองชัดขึ้น\nความแกร่งเกิดจากการเผชิญ ไม่ใช่การหลีกเลี่ยง",
      },
    ],
  },
  4: {
    id: 4,
    title: "บทที่ 4: การเติบโต",
    introTitle: "บทบรรยาย",
    backgroundImageUrl: "/images/chapters-explain-bg-1920x1080.svg",
    lockState: "locked",
    progress: "not-started",
    scenes: [
      {
        id: "c4s0",
        index: 0,
        speakerName: "ผู้บรรยาย",
        text: "ผลลัพธ์ของความสม่ำเสมอเริ่มเผยให้เห็น — ดูความเปลี่ยนแปลงที่เกิดขึ้น",
      },
      {
        id: "c4s1",
        index: 1,
        speakerName: "ชื่อตัวละคร",
        speakerImageUrl: "/images/chapter-speaker-girl-transparent.png",
        text: "ฉันรู้สึกภูมิใจที่ทำได้ต่อเนื่อง\nสุขภาพดีขึ้น และจิตใจก็เบาขึ้นด้วย",
      },
      {
        id: "c4s2",
        index: 2,
        speakerName: "ผู้บรรยาย",
        text: "การเติบโตมักเกิดขึ้นอย่างเงียบ ๆ\nบันทึกที่สะสมมาทุกวันคือหลักฐานของความพยายาม",
      },
      {
        id: "c4s3",
        index: 3,
        speakerName: "ชื่อตัวละคร",
        speakerImageUrl: "/images/chapter-speaker-girl-transparent.png",
        text: "ตอนนี้ฉันเริ่มเชื่อมั่นในตัวเองมากขึ้น\nฉันรู้ว่าฉันทำได้ถ้าตั้งใจจริง",
      },
      {
        id: "c4s4",
        index: 4,
        speakerName: "ผู้บรรยาย",
        text: "ทุกประสบการณ์ได้หล่อหลอมเป็นพลังใหม่\nพร้อมแล้วสำหรับก้าวต่อไป",
      },
    ],
  },
  5: {
    id: 5,
    title: "บทที่ 5: บทสรุป",
    introTitle: "บทบรรยาย",
    backgroundImageUrl: "/images/chapters-explain-bg-1920x1080.svg",
    lockState: "locked",
    progress: "not-started",
    scenes: [
      {
        id: "c5s0",
        index: 0,
        speakerName: "ผู้บรรยาย",
        text: "การเดินทางครั้งนี้กำลังจะถึงบทสรุป — มาทบทวนสิ่งที่ได้เรียนรู้ด้วยกัน",
      },
      {
        id: "c5s1",
        index: 1,
        speakerName: "ชื่อตัวละคร",
        speakerImageUrl: "/images/chapter-speaker-girl-transparent.png",
        text: "ฉันได้เรียนรู้ว่าการดูแลตัวเองเริ่มจากวันนี้\nไม่ต้องรอให้พร้อมก่อนถึงจะเริ่มได้",
      },
      {
        id: "c5s2",
        index: 2,
        speakerName: "ผู้บรรยาย",
        text: "ความสม่ำเสมอและความเข้าใจคือหัวใจสำคัญ\nทำทีละน้อยทุกวันดีกว่าทำมากแค่วันเดียว",
      },
      {
        id: "c5s3",
        index: 3,
        speakerName: "ชื่อตัวละคร",
        speakerImageUrl: "/images/chapter-speaker-girl-transparent.png",
        text: "ฉันพร้อมจะเดินหน้าต่อด้วยความมั่นใจ\nขอบคุณ Story Diary ที่เป็นเพื่อนร่วมทาง",
      },
      {
        id: "c5s4",
        index: 4,
        speakerName: "ผู้บรรยาย",
        text: "เรื่องราวบทนี้จบลง แต่การดูแลสุขภาพยังดำเนินต่อไป\nจงรักษานิสัยดี ๆ ที่สร้างมาตลอดการเดินทางนี้",
      },
    ],
  },
};

const initialState: ChaptersState = {
  summaries: [],
  byId: {},
  summariesStatus: "idle",
  detailStatus: {},
  lockHintFor: null,
};

export const fetchSummaries = createAsyncThunk(
  "chapters/fetchSummaries",
  async () => {
    await new Promise((r) => setTimeout(r, 200));
    return MOCK_SUMMARIES;
  }
);

export const fetchChapter = createAsyncThunk(
  "chapters/fetchChapter",
  async (id: ChapterId) => {
    await new Promise((r) => setTimeout(r, 200));
    const chapter = MOCK_CHAPTERS[id];
    if (!chapter) throw new Error("CHAPTER_NOT_FOUND");
    return chapter;
  }
);

const chaptersSlice = createSlice({
  name: "chapters",
  initialState,
  reducers: {
    showLockHint(state, action: PayloadAction<ChapterId>) {
      state.lockHintFor = action.payload;
    },
    clearLockHint(state) {
      state.lockHintFor = null;
    },
    markCompleted(state, action: PayloadAction<ChapterId>) {
      const id = action.payload;
      const chapter = state.byId[id];
      if (chapter) chapter.progress = "completed";
      const summary = state.summaries.find((s) => s.id === id);
      if (summary) summary.progress = "completed";
      const nextSummary = state.summaries.find((s) => s.id === id + 1);
      if (nextSummary) nextSummary.lockState = "unlocked";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSummaries.pending, (state) => {
        state.summariesStatus = "loading";
      })
      .addCase(fetchSummaries.fulfilled, (state, action) => {
        state.summariesStatus = "ready";
        state.summaries = action.payload;
      })
      .addCase(fetchSummaries.rejected, (state) => {
        state.summariesStatus = "error";
      })
      .addCase(fetchChapter.pending, (state, action) => {
        state.detailStatus[action.meta.arg] = "loading";
      })
      .addCase(fetchChapter.fulfilled, (state, action) => {
        const chapter = action.payload;
        state.detailStatus[chapter.id] = "ready";
        state.byId[chapter.id] = chapter;
      })
      .addCase(fetchChapter.rejected, (state, action) => {
        state.detailStatus[action.meta.arg] = "error";
      });
  },
});

export const { showLockHint, clearLockHint, markCompleted } = chaptersSlice.actions;
export default chaptersSlice.reducer;

export const selectChapterSummaries = (state: { chapters: ChaptersState }) =>
  state.chapters.summaries;
export const selectSummariesStatus = (state: { chapters: ChaptersState }) =>
  state.chapters.summariesStatus;
export const selectChapter = (state: { chapters: ChaptersState }, id: ChapterId) =>
  state.chapters.byId[id];
export const selectChapterDetailStatus = (
  state: { chapters: ChaptersState },
  id: ChapterId
) => state.chapters.detailStatus[id] ?? "idle";
export const selectLockHintFor = (state: { chapters: ChaptersState }) =>
  state.chapters.lockHintFor;
