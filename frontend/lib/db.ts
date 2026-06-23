import { MongoClient, ServerApiVersion, type Db } from "mongodb";
import dns from "dns";

type DatabaseMode = "memory" | "mongo";

const mode: DatabaseMode =
  process.env.DB_MODE === "mongo"
    ? "mongo"
    : process.env.NODE_ENV === "test"
      ? "memory"
      : "mongo";

const CHAR_IMG = "/images/chapter-speaker-girl-transparent.png";
const NARRATOR_IMG = "/images/chapter-speaker-narrator-transparent.png";

export interface UserDoc {
  id: string;
  name: string;
  tel: string;
  password_hash: string;
  character_name: string;
  gender: "male" | "female";
  avatar_url?: string | null;
  role?: "user" | "admin" | "rootAdmin";
  /** IANA timezone string, e.g. "Asia/Bangkok". Used to compute local calendar dates. */
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface ChapterDoc {
  id: number;
  title: string;
  intro_title: string;
  background_image_url?: string | null;
  lock_state: "unlocked" | "locked";
  sort_order: number;
}

export interface ChapterSceneDoc {
  id: string;
  chapter_id: number;
  idx: number;
  speaker_name: string;
  speaker_image_url?: string | null;
  text: string;
}

export interface ChapterProgressDoc {
  user_id: string;
  chapter_id: number;
  progress: "not-started" | "in-progress" | "completed";
}

export interface HabitActivityDoc {
  id: string;
  user_id: string;
  category: "medicine" | "nutrition" | "physical";
  nutrition_preset?: string | null;
  physical_category?: string | null;
  physical_preset?: string | null;
  name: string;
  name_normalized: string;
  icon_color?: string | null;
  schedule_json: string;
  meal_relation?: "before" | "after" | null;
  meal_slots_json?: string | null;
  /** Medicine-only stable catalogue key; null for "Other"/legacy meds. */
  medicine_key?: string | null;
  created_at: string;
  updated_at: string;
  archived: boolean;
}

export interface HabitOccurrenceDoc {
  id: string;
  activity_id: string;
  date: string;
  status: "pending" | "partial" | "done" | "skipped";
  completed_at?: string | null;
}

export interface QuizQuestionDoc {
  id: string;
  sort_order: number;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation?: string | null;
}

export interface QuizAttemptDoc {
  id: string;
  user_id: string;
  quiz_id: string;
  started_at: string;
  completed_at: string;
  score_points: number;
  score_correct: number;
  answers_json: string;
}

export interface MedicineCheckinDoc {
  id: string;
  occurrence_id: string;
  medicine_name: string;
  meal_relation: string;
  meal_slots_json: string;
  side_effects_json: string;
  /** Free-text note for "Other"/legacy meds; absent for known meds. */
  side_effect_note?: string | null;
  created_at: string;
}

export interface NutritionCheckinDoc {
  id: string;
  occurrence_id: string;
  activity_name: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  created_at: string;
}

export interface SymptomsCheckinDoc {
  id: string;
  occurrence_id: string;
  items_json: string;
  created_at: string;
}

export interface MoodCheckinDoc {
  id: string;
  occurrence_id: string;
  mood: string;
  slider_value: number;
  created_at: string;
}

export interface EBookDoc {
  id: string;
  title: string;
  pdf_url: string;
  sort_order: number;
}

export interface VideoClipDoc {
  id: string;
  caption: string;
  source_url: string;
  thumbnail_url?: string | null;
  sort_order: number;
}

interface MemoryStore {
  users: UserDoc[];
  chapters: ChapterDoc[];
  chapterScenes: ChapterSceneDoc[];
  chapterProgress: ChapterProgressDoc[];
  habitActivities: HabitActivityDoc[];
  habitOccurrences: HabitOccurrenceDoc[];
  quizQuestions: QuizQuestionDoc[];
  quizAttempts: QuizAttemptDoc[];
  medicineCheckins: MedicineCheckinDoc[];
  nutritionCheckins: NutritionCheckinDoc[];
  symptomsCheckins: SymptomsCheckinDoc[];
  moodCheckins: MoodCheckinDoc[];
  eBooks: EBookDoc[];
  videoClips: VideoClipDoc[];
}

const E_BOOKS: EBookDoc[] = [1, 2, 3, 4, 5].map((n) => ({
  id: `ebk-${n}`,
  title: `บทที่ ${n}`,
  pdf_url: `/e-books/ch0${n}.pdf`,
  sort_order: n,
}));

const TEST_VIDEO_URL = "https://www.youtube.com/watch?v=Ktxam4bHrTo";

const VIDEO_CLIPS: VideoClipDoc[] = [1, 2, 3, 4, 5].map((n) => ({
  id: `clip-${n}`,
  caption: `คลิป ${n}`,
  source_url: TEST_VIDEO_URL,
  sort_order: n,
}));

const CHAPTERS: ChapterDoc[] = [
  { id: 1, title: "บทที่ 1: เริ่มต้นการเดินทาง", intro_title: "บทบรรยาย", lock_state: "unlocked", sort_order: 1 },
  { id: 2, title: "บทที่ 2: การเรียนรู้", intro_title: "บทบรรยาย", lock_state: "locked", sort_order: 2 },
  { id: 3, title: "บทที่ 3: ความท้าทาย", intro_title: "บทบรรยาย", lock_state: "locked", sort_order: 3 },
  { id: 4, title: "บทที่ 4: การเติบโต", intro_title: "บทบรรยาย", lock_state: "locked", sort_order: 4 },
  { id: 5, title: "บทที่ 5: บทสรุป", intro_title: "บทบรรยาย", lock_state: "locked", sort_order: 5 },
];

const CHAPTER_SCENES: ChapterSceneDoc[] = [
  { id: "c1s0", chapter_id: 1, idx: 0, speaker_name: "ผู้บรรยาย", speaker_image_url: NARRATOR_IMG, text: "ยินดีต้อนรับสู่ Story Diary — บันทึกการเดินทางสุขภาพของคุณ\nวันนี้เราจะเริ่มต้นก้าวแรกด้วยกัน" },
  { id: "c1s1", chapter_id: 1, idx: 1, speaker_name: "ชื่อตัวละคร", speaker_image_url: CHAR_IMG, text: "สวัสดี! ฉันชื่อ... ยังไม่รู้จะตั้งชื่ออะไรดี แต่ฉันพร้อมแล้วที่จะดูแลสุขภาพ" },
  { id: "c1s2", chapter_id: 1, idx: 2, speaker_name: "ผู้บรรยาย", speaker_image_url: NARRATOR_IMG, text: "การดูแลสุขภาพไม่ใช่เรื่องยาก เพียงแค่เริ่มต้นทีละก้าว\nบันทึกกิจกรรมประจำวัน ติดตามความก้าวหน้า และสนุกกับการเรียนรู้" },
  { id: "c1s3", chapter_id: 1, idx: 3, speaker_name: "ชื่อตัวละคร", speaker_image_url: CHAR_IMG, text: "ฉันจะลองดู! เริ่มจากการบันทึกยาที่ต้องทานและอาหารในแต่ละวัน" },
  { id: "c1s4", chapter_id: 1, idx: 4, speaker_name: "ผู้บรรยาย", speaker_image_url: NARRATOR_IMG, text: "ยอดเยี่ยมมาก! ไปดูกันเลยว่ามีอะไรรออยู่บ้างในการเดินทางครั้งนี้" },
  { id: "c2s0", chapter_id: 2, idx: 0, speaker_name: "ผู้บรรยาย", speaker_image_url: NARRATOR_IMG, text: "บทเรียนใหม่กำลังเริ่มต้นขึ้น — วันนี้เราจะเรียนรู้ว่าร่างกายทำงานอย่างไร" },
  { id: "c2s1", chapter_id: 2, idx: 1, speaker_name: "ชื่อตัวละคร", speaker_image_url: CHAR_IMG, text: "ฉันอยากเข้าใจร่างกายของตัวเองให้มากขึ้น ทำไมบางวันถึงรู้สึกอ่อนเพลีย?" },
  { id: "c2s2", chapter_id: 2, idx: 2, speaker_name: "ผู้บรรยาย", speaker_image_url: NARRATOR_IMG, text: "ความรู้ที่ถูกต้องช่วยให้การตัดสินใจง่ายขึ้น\nการรู้ว่าอาหารแต่ละประเภทมีผลต่อร่างกายอย่างไรคือก้าวสำคัญ" },
  { id: "c2s3", chapter_id: 2, idx: 3, speaker_name: "ชื่อตัวละคร", speaker_image_url: CHAR_IMG, text: "ถ้าฉันฝึกสม่ำเสมอและบันทึกทุกวัน ฉันจะดูแลตัวเองได้ดีขึ้นแน่นอน" },
  { id: "c2s4", chapter_id: 2, idx: 4, speaker_name: "ผู้บรรยาย", speaker_image_url: NARRATOR_IMG, text: "ทุกคำตอบที่ค้นพบจะกลายเป็นพลังใจ\nการเรียนรู้ไม่มีวันสิ้นสุด" },
  { id: "c3s0", chapter_id: 3, idx: 0, speaker_name: "ผู้บรรยาย", speaker_image_url: NARRATOR_IMG, text: "เส้นทางนี้ไม่ได้ราบรื่นเสมอไป — ความท้าทายคือส่วนหนึ่งของการเติบโต" },
  { id: "c3s1", chapter_id: 3, idx: 1, speaker_name: "ชื่อตัวละคร", speaker_image_url: CHAR_IMG, text: "บางวันฉันก็รู้สึกเหนื่อยและไม่มั่นใจ อยากเลิกทำทุกอย่างเลย" },
  { id: "c3s2", chapter_id: 3, idx: 2, speaker_name: "ผู้บรรยาย", speaker_image_url: NARRATOR_IMG, text: "ความท้าทายคือบททดสอบของความตั้งใจ\nทุกคนล้มได้ แต่สิ่งสำคัญคือการลุกขึ้นมาใหม่" },
  { id: "c3s3", chapter_id: 3, idx: 3, speaker_name: "ชื่อตัวละคร", speaker_image_url: CHAR_IMG, text: "ฉันจะไม่ยอมแพ้ให้กับอุปสรรคเล็ก ๆ\nฉันจะจดบันทึกทุกวันไม่ว่าจะรู้สึกอย่างไร" },
  { id: "c3s4", chapter_id: 3, idx: 4, speaker_name: "ผู้บรรยาย", speaker_image_url: NARRATOR_IMG, text: "เมื่อก้าวผ่านได้ เราจะเห็นตัวเองชัดขึ้น\nความแกร่งเกิดจากการเผชิญ ไม่ใช่การหลีกเลี่ยง" },
  { id: "c4s0", chapter_id: 4, idx: 0, speaker_name: "ผู้บรรยาย", speaker_image_url: NARRATOR_IMG, text: "ผลลัพธ์ของความสม่ำเสมอเริ่มเผยให้เห็น — ดูความเปลี่ยนแปลงที่เกิดขึ้น" },
  { id: "c4s1", chapter_id: 4, idx: 1, speaker_name: "ชื่อตัวละคร", speaker_image_url: CHAR_IMG, text: "ฉันรู้สึกภูมิใจที่ทำได้ต่อเนื่อง\nสุขภาพดีขึ้น และจิตใจก็เบาขึ้นด้วย" },
  { id: "c4s2", chapter_id: 4, idx: 2, speaker_name: "ผู้บรรยาย", speaker_image_url: NARRATOR_IMG, text: "การเติบโตมักเกิดขึ้นอย่างเงียบ ๆ\nบันทึกที่สะสมมาทุกวันคือหลักฐานของความพยายาม" },
  { id: "c4s3", chapter_id: 4, idx: 3, speaker_name: "ชื่อตัวละคร", speaker_image_url: CHAR_IMG, text: "ตอนนี้ฉันเริ่มเชื่อมั่นในตัวเองมากขึ้น\nฉันรู้ว่าฉันทำได้ถ้าตั้งใจจริง" },
  { id: "c4s4", chapter_id: 4, idx: 4, speaker_name: "ผู้บรรยาย", speaker_image_url: NARRATOR_IMG, text: "ทุกประสบการณ์ได้หล่อหลอมเป็นพลังใหม่\nพร้อมแล้วสำหรับก้าวต่อไป" },
  { id: "c5s0", chapter_id: 5, idx: 0, speaker_name: "ผู้บรรยาย", speaker_image_url: NARRATOR_IMG, text: "การเดินทางครั้งนี้กำลังจะถึงบทสรุป — มาทบทวนสิ่งที่ได้เรียนรู้ด้วยกัน" },
  { id: "c5s1", chapter_id: 5, idx: 1, speaker_name: "ชื่อตัวละคร", speaker_image_url: CHAR_IMG, text: "ฉันได้เรียนรู้ว่าการดูแลตัวเองเริ่มจากวันนี้\nไม่ต้องรอให้พร้อมก่อนถึงจะเริ่มได้" },
  { id: "c5s2", chapter_id: 5, idx: 2, speaker_name: "ผู้บรรยาย", speaker_image_url: NARRATOR_IMG, text: "ความสม่ำเสมอและความเข้าใจคือหัวใจสำคัญ\nทำทีละน้อยทุกวันดีกว่าทำมากแค่วันเดียว" },
  { id: "c5s3", chapter_id: 5, idx: 3, speaker_name: "ชื่อตัวละคร", speaker_image_url: CHAR_IMG, text: "ฉันพร้อมจะเดินหน้าต่อด้วยความมั่นใจ\nขอบคุณ Story Diary ที่เป็นเพื่อนร่วมทาง" },
  { id: "c5s4", chapter_id: 5, idx: 4, speaker_name: "ผู้บรรยาย", speaker_image_url: NARRATOR_IMG, text: "เรื่องราวบทนี้จบลง แต่การดูแลสุขภาพยังดำเนินต่อไป\nจงรักษานิสัยดี ๆ ที่สร้างมาตลอดการเดินทางนี้" },
];

const QUIZ_QUESTIONS: QuizQuestionDoc[] = [
  { id: "q1", sort_order: 1, text: "ควรหลีกเลี่ยงแสงแดดในช่วงเวลาใดเพื่อป้องกันผิวหนังจากแสงยูวี?", option_a: "06:00 – 09:00 น.", option_b: "10:00 – 16:00 น.", option_c: "16:00 – 18:00 น.", option_d: "18:00 – 20:00 น.", correct_answer: "B", explanation: "แสงยูวีจะรุนแรงที่สุดในช่วง 10:00 – 16:00 น." },
  { id: "q2", sort_order: 2, text: "อาหารประเภทใดมีประโยชน์ต่อสุขภาพหัวใจมากที่สุด?", option_a: "อาหารทอดและไขมันสูง", option_b: "ผักและผลไม้สด", option_c: "ขนมหวานและน้ำตาล", option_d: "เครื่องดื่มแอลกอฮอล์", correct_answer: "B", explanation: "ผักและผลไม้สดมีวิตามิน แร่ธาตุ และเส้นใยอาหารที่ดีต่อหัวใจ" },
  { id: "q3", sort_order: 3, text: "ควรออกกำลังกายอย่างน้อยกี่นาทีต่อวันสำหรับผู้ใหญ่ที่มีสุขภาพดี?", option_a: "10 นาที", option_b: "20 นาที", option_c: "30 นาที", option_d: "60 นาที", correct_answer: "C", explanation: "WHO แนะนำให้ออกกำลังกายระดับปานกลางอย่างน้อย 30 นาทีต่อวัน" },
  { id: "q4", sort_order: 4, text: "น้ำดื่มที่ร่างกายต้องการต่อวันโดยประมาณเท่าไร?", option_a: "500 มล.", option_b: "1 ลิตร", option_c: "1.5 – 2 ลิตร", option_d: "3 ลิตร", correct_answer: "C", explanation: "ร่างกายต้องการน้ำ 1.5–2 ลิตรต่อวัน หรือประมาณ 8 แก้ว" },
  { id: "q5", sort_order: 5, text: "ข้อใดเป็นอาการเตือนของโรคเบาหวาน?", option_a: "ปวดหัว และไข้", option_b: "ปัสสาวะบ่อย กระหายน้ำมาก และอ่อนเพลีย", option_c: "ปวดข้อและผิวหนังอักเสบ", option_d: "ไอและเจ็บคอ", correct_answer: "B", explanation: "อาการของโรคเบาหวาน ได้แก่ ปัสสาวะบ่อย กระหายน้ำมาก และอ่อนเพลียผิดปกติ" },
  { id: "q6", sort_order: 6, text: "การนอนหลับที่เพียงพอสำหรับผู้ใหญ่คือกี่ชั่วโมงต่อคืน?", option_a: "4 – 5 ชั่วโมง", option_b: "5 – 6 ชั่วโมง", option_c: "7 – 9 ชั่วโมง", option_d: "10 – 12 ชั่วโมง", correct_answer: "C", explanation: "ผู้ใหญ่ควรนอนหลับ 7–9 ชั่วโมงต่อคืนเพื่อสุขภาพที่ดี" },
  { id: "q7", sort_order: 7, text: "วิตามินดีได้รับจากแหล่งใดเป็นหลัก?", option_a: "อาหารทะเล", option_b: "แสงแดด", option_c: "ผักใบเขียว", option_d: "นม", correct_answer: "B", explanation: "ร่างกายสังเคราะห์วิตามินดีได้จากแสงแดด" },
  { id: "q8", sort_order: 8, text: "ค่าดัชนีมวลกาย (BMI) ปกติสำหรับผู้ใหญ่คือเท่าใด?", option_a: "น้อยกว่า 15", option_b: "15 – 17.9", option_c: "18.5 – 24.9", option_d: "25 – 30", correct_answer: "C", explanation: "BMI ปกติอยู่ที่ 18.5 – 24.9 กก./ม²" },
  { id: "q9", sort_order: 9, text: "การล้างมือที่ถูกวิธีควรใช้เวลานานเท่าใด?", option_a: "5 วินาที", option_b: "10 วินาที", option_c: "20 วินาที", option_d: "1 นาที", correct_answer: "C", explanation: "ควรล้างมือนาน 20 วินาที หรือร้องเพลงวันเกิดสองรอบ" },
  { id: "q10", sort_order: 10, text: "ข้อใดเป็นสัญญาณเตือนของโรคหลอดเลือดสมอง (Stroke)?", option_a: "ปวดท้องและคลื่นไส้", option_b: "ใบหน้าเบี้ยว แขนอ่อนแรง และพูดไม่ชัด", option_c: "ผื่นคันตามผิวหนัง", option_d: "ไอเรื้อรังและเจ็บหน้าอก", correct_answer: "B", explanation: "F.A.S.T.: ใบหน้า (Face) แขน (Arms) การพูด (Speech) และเวลา (Time)" },
  { id: "q11", sort_order: 11, text: "ธาตุเหล็กพบมากในอาหารประเภทใด?", option_a: "ข้าวและแป้ง", option_b: "เนื้อสัตว์สีแดงและผักใบเขียวเข้ม", option_c: "ผลไม้รสหวาน", option_d: "นมและผลิตภัณฑ์นม", correct_answer: "B", explanation: "ธาตุเหล็กพบมากในเนื้อสัตว์สีแดง ตับ และผักใบเขียวเข้ม เช่น ผักโขม" },
  { id: "q12", sort_order: 12, text: "ความดันโลหิตปกติสำหรับผู้ใหญ่ควรอยู่ที่เท่าใด?", option_a: "น้อยกว่า 80/50 มม.ปรอท", option_b: "120/80 มม.ปรอท หรือต่ำกว่า", option_c: "140/90 มม.ปรอท", option_d: "160/100 มม.ปรอท", correct_answer: "B", explanation: "ความดันโลหิตปกติอยู่ที่ 120/80 มม.ปรอทหรือต่ำกว่า" },
  { id: "q13", sort_order: 13, text: "การสูบบุหรี่เพิ่มความเสี่ยงต่อโรคใดมากที่สุด?", option_a: "โรคผิวหนัง", option_b: "โรคปอดและโรคหัวใจ", option_c: "โรคข้อเข่าเสื่อม", option_d: "โรคกระดูกพรุน", correct_answer: "B", explanation: "การสูบบุหรี่เป็นปัจจัยเสี่ยงหลักของมะเร็งปอด โรคปอดอุดกั้นเรื้อรัง และโรคหัวใจ" },
];

let initialized = false;
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let memoryStore: MemoryStore = createSeededMemoryStore();

function createSeededMemoryStore(): MemoryStore {
  return {
    users: [],
    chapters: CHAPTERS.map((chapter) => ({ ...chapter })),
    chapterScenes: CHAPTER_SCENES.map((scene) => ({ ...scene })),
    chapterProgress: [],
    habitActivities: [],
    habitOccurrences: [],
    quizQuestions: QUIZ_QUESTIONS.map((question) => ({ ...question })),
    quizAttempts: [],
    medicineCheckins: [],
    nutritionCheckins: [],
    symptomsCheckins: [],
    moodCheckins: [],
    eBooks: E_BOOKS.map((ebook) => ({ ...ebook })),
    videoClips: VIDEO_CLIPS.map((clip) => ({ ...clip })),
  };
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[story-diary] Missing required environment variable ${name}`);
  }
  return value;
}

function getMongoDatabaseName(): string {
  return process.env.MONGODB_DB_NAME?.trim() || "story-diary";
}

function buildMongoUri(): string {
  const explicitUri = process.env.MONGODB_URI?.trim();
  if (explicitUri) {
    return explicitUri;
  }

  const username = encodeURIComponent(getRequiredEnv("MONGODB_USERNAME"));
  const password = encodeURIComponent(getRequiredEnv("MONGODB_PASSWORD"));
  const host = process.env.MONGODB_CLUSTER_HOST?.trim() || "cluster0.563g7gd.mongodb.net";
  const query = process.env.MONGODB_QUERY?.trim() || "retryWrites=true&w=majority&appName=Cluster0";
  const dbName = encodeURIComponent(getMongoDatabaseName());

  return `mongodb+srv://${username}:${password}@${host}/${dbName}?${query}`;
}

function requireMongoDb(): Db {
  if (!mongoDb) {
    throw new Error("[story-diary] Database has not been initialized");
  }
  return mongoDb;
}

function usersCollection() {
  return requireMongoDb().collection<UserDoc>("users");
}

function chaptersCollection() {
  return requireMongoDb().collection<ChapterDoc>("chapters");
}

function chapterScenesCollection() {
  return requireMongoDb().collection<ChapterSceneDoc>("chapter_scenes");
}

function chapterProgressCollection() {
  return requireMongoDb().collection<ChapterProgressDoc>("user_chapter_progress");
}

function habitActivitiesCollection() {
  return requireMongoDb().collection<HabitActivityDoc>("habit_activities");
}

function habitOccurrencesCollection() {
  return requireMongoDb().collection<HabitOccurrenceDoc>("habit_occurrences");
}

function quizQuestionsCollection() {
  return requireMongoDb().collection<QuizQuestionDoc>("quiz_questions");
}

function quizAttemptsCollection() {
  return requireMongoDb().collection<QuizAttemptDoc>("quiz_attempts");
}

function medicineCheckinsCollection() {
  return requireMongoDb().collection<MedicineCheckinDoc>("medicine_checkins");
}

function nutritionCheckinsCollection() {
  return requireMongoDb().collection<NutritionCheckinDoc>("nutrition_checkins");
}

function symptomsCheckinsCollection() {
  return requireMongoDb().collection<SymptomsCheckinDoc>("symptoms_checkins");
}

function moodCheckinsCollection() {
  return requireMongoDb().collection<MoodCheckinDoc>("mood_checkins");
}

function eBooksCollection() {
  return requireMongoDb().collection<EBookDoc>("e_books");
}

function videoClipsCollection() {
  return requireMongoDb().collection<VideoClipDoc>("video_clips");
}

/**
 * Drop indexes left over from removed fields. The quiz_questions `number_1`
 * unique index predates removing the `number` field; without dropping it,
 * re-seeding fails with E11000 dup key { number: null } because every doc now
 * indexes the absent field as null. Idempotent: ignores IndexNotFound (27) and
 * NamespaceNotFound (26), so it's a no-op once each environment is migrated.
 * Safe to delete this helper once all live databases are known-migrated.
 */
async function dropStaleIndexes(): Promise<void> {
  try {
    await quizQuestionsCollection().dropIndex("number_1");
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code !== 26 && code !== 27) throw err;
  }
}

async function ensureMongoIndexes(): Promise<void> {
  await dropStaleIndexes();
  await Promise.all([
    usersCollection().createIndex({ id: 1 }, { unique: true }),
    usersCollection().createIndex({ tel: 1 }, { unique: true }),
    chaptersCollection().createIndex({ id: 1 }, { unique: true }),
    chapterScenesCollection().createIndex({ id: 1 }, { unique: true }),
    chapterScenesCollection().createIndex({ chapter_id: 1, idx: 1 }, { unique: true }),
    chapterProgressCollection().createIndex({ user_id: 1, chapter_id: 1 }, { unique: true }),
    habitActivitiesCollection().createIndex({ id: 1 }, { unique: true }),
    habitActivitiesCollection().createIndex({ user_id: 1, name_normalized: 1, archived: 1 }),
    habitOccurrencesCollection().createIndex({ id: 1 }, { unique: true }),
    habitOccurrencesCollection().createIndex({ activity_id: 1, date: 1 }, { unique: true }),
    quizQuestionsCollection().createIndex({ id: 1 }, { unique: true }),
    quizQuestionsCollection().createIndex({ sort_order: 1 }),
    quizAttemptsCollection().createIndex({ id: 1 }, { unique: true }),
    medicineCheckinsCollection().createIndex({ occurrence_id: 1 }, { unique: true }),
    nutritionCheckinsCollection().createIndex({ occurrence_id: 1 }, { unique: true }),
    symptomsCheckinsCollection().createIndex({ occurrence_id: 1 }, { unique: true }),
    moodCheckinsCollection().createIndex({ occurrence_id: 1 }, { unique: true }),
    eBooksCollection().createIndex({ id: 1 }, { unique: true }),
    eBooksCollection().createIndex({ sort_order: 1 }),
    videoClipsCollection().createIndex({ id: 1 }, { unique: true }),
    videoClipsCollection().createIndex({ sort_order: 1 }),
  ]);
}

async function seedMongoReferenceData(): Promise<void> {
  await Promise.all([
    chaptersCollection().bulkWrite(
      CHAPTERS.map((chapter) => ({
        updateOne: {
          filter: { id: chapter.id },
          update: { $setOnInsert: chapter },
          upsert: true,
        },
      }))
    ),
    chapterScenesCollection().bulkWrite(
      CHAPTER_SCENES.map((scene) => ({
        updateOne: {
          filter: { id: scene.id },
          update: { $setOnInsert: scene },
          upsert: true,
        },
      }))
    ),
    quizQuestionsCollection().bulkWrite(
      QUIZ_QUESTIONS.map((question) => ({
        updateOne: {
          filter: { id: question.id },
          update: { $setOnInsert: question },
          upsert: true,
        },
      }))
    ),
    eBooksCollection().bulkWrite(
      E_BOOKS.map((ebook) => ({
        updateOne: {
          filter: { id: ebook.id },
          update: { $setOnInsert: ebook },
          upsert: true,
        },
      }))
    ),
    videoClipsCollection().bulkWrite(
      VIDEO_CLIPS.map((clip) => ({
        updateOne: {
          filter: { id: clip.id },
          update: { $setOnInsert: clip },
          upsert: true,
        },
      }))
    ),
  ]);
}

export async function initializeDatabase(): Promise<void> {
  if (initialized) {
    return;
  }

  if (mode === "memory") {
    memoryStore = createSeededMemoryStore();
    initialized = true;
    return;
  }

  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  mongoClient = new MongoClient(buildMongoUri(), {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await mongoClient.connect();
  mongoDb = mongoClient.db(getMongoDatabaseName());
  await ensureMongoIndexes();
  await seedMongoReferenceData();
  initialized = true;
}

export async function closeDatabase(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
  }
  mongoClient = null;
  mongoDb = null;
  initialized = false;
}

export function clearTestData(): void {
  memoryStore = createSeededMemoryStore();
  initialized = true;
}

export async function clearUserDataForTesting(): Promise<void> {
  if (mode === "memory") {
    memoryStore.users = [];
    memoryStore.chapterProgress = [];
    memoryStore.habitActivities = [];
    memoryStore.habitOccurrences = [];
    memoryStore.quizAttempts = [];
    memoryStore.medicineCheckins = [];
    memoryStore.nutritionCheckins = [];
    memoryStore.symptomsCheckins = [];
    memoryStore.moodCheckins = [];
    return;
  }
  const db = requireMongoDb();
  await Promise.all([
    db.collection("users").deleteMany({}),
    db.collection("user_chapter_progress").deleteMany({}),
    db.collection("habit_activities").deleteMany({}),
    db.collection("habit_occurrences").deleteMany({}),
    db.collection("quiz_attempts").deleteMany({}),
    db.collection("medicine_checkins").deleteMany({}),
    db.collection("nutrition_checkins").deleteMany({}),
    db.collection("symptoms_checkins").deleteMany({}),
    db.collection("mood_checkins").deleteMany({}),
  ]);
}

export async function findUserByTel(tel: string): Promise<UserDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.users.find((user) => user.tel === tel);
  }
  return (await usersCollection().findOne({ tel })) ?? undefined;
}

export async function findUserById(id: string): Promise<UserDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.users.find((user) => user.id === id);
  }
  return (await usersCollection().findOne({ id })) ?? undefined;
}

export async function findUserByTelExcludingId(tel: string, excludedId: string): Promise<UserDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.users.find((user) => user.tel === tel && user.id !== excludedId);
  }
  return (await usersCollection().findOne({ tel, id: { $ne: excludedId } })) ?? undefined;
}

export async function insertUser(user: UserDoc): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    memoryStore.users.push({ ...user });
    return;
  }
  await usersCollection().insertOne(user);
}

export async function updateUserDoc(id: string, patch: Partial<UserDoc>): Promise<UserDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.users.findIndex((user) => user.id === id);
    if (index === -1) {
      return undefined;
    }
    memoryStore.users[index] = { ...memoryStore.users[index], ...patch };
    return memoryStore.users[index];
  }
  const result = await usersCollection().findOneAndUpdate(
    { id },
    { $set: patch },
    { returnDocument: "after" }
  );
  return result ?? undefined;
}

export async function listAllUsers(): Promise<UserDoc[]> {
  await initializeDatabase();
  if (mode === "memory") {
    return [...memoryStore.users];
  }
  return usersCollection().find({}).toArray();
}

export async function listChaptersDocs(): Promise<ChapterDoc[]> {
  await initializeDatabase();
  if (mode === "memory") {
    return [...memoryStore.chapters].sort((a, b) => a.sort_order - b.sort_order);
  }
  return chaptersCollection().find({}, { sort: { sort_order: 1 } }).toArray();
}

export async function findChapterById(chapterId: number): Promise<ChapterDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.chapters.find((chapter) => chapter.id === chapterId);
  }
  return (await chaptersCollection().findOne({ id: chapterId })) ?? undefined;
}

export async function listChapterScenesByChapterId(chapterId: number): Promise<ChapterSceneDoc[]> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.chapterScenes
      .filter((scene) => scene.chapter_id === chapterId)
      .sort((a, b) => a.idx - b.idx);
  }
  return chapterScenesCollection().find({ chapter_id: chapterId }, { sort: { idx: 1 } }).toArray();
}

export async function getChapterProgressDoc(userId: string, chapterId: number): Promise<ChapterProgressDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.chapterProgress.find((progress) => progress.user_id === userId && progress.chapter_id === chapterId);
  }
  return (await chapterProgressCollection().findOne({ user_id: userId, chapter_id: chapterId })) ?? undefined;
}

export async function upsertChapterProgress(userId: string, chapterId: number, progress: ChapterProgressDoc["progress"]): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.chapterProgress.findIndex((row) => row.user_id === userId && row.chapter_id === chapterId);
    const nextRow: ChapterProgressDoc = { user_id: userId, chapter_id: chapterId, progress };
    if (index === -1) {
      memoryStore.chapterProgress.push(nextRow);
    } else {
      memoryStore.chapterProgress[index] = nextRow;
    }
    return;
  }
  await chapterProgressCollection().updateOne(
    { user_id: userId, chapter_id: chapterId },
    { $set: { progress } },
    { upsert: true }
  );
}

export async function unlockNextChapterBySortOrder(currentSortOrder: number): Promise<void> {
  await initializeDatabase();
  const nextSortOrder = currentSortOrder + 1;
  if (mode === "memory") {
    const chapter = memoryStore.chapters.find((c) => c.sort_order === nextSortOrder);
    if (chapter) {
      chapter.lock_state = "unlocked";
    }
    return;
  }
  await chaptersCollection().updateOne(
    { sort_order: nextSortOrder },
    { $set: { lock_state: "unlocked" } }
  );
}

export async function listHabitActivitiesByUser(userId: string, options?: { includeArchived?: boolean }): Promise<HabitActivityDoc[]> {
  await initializeDatabase();
  const includeArchived = options?.includeArchived ?? false;

  if (mode === "memory") {
    return memoryStore.habitActivities
      .filter((activity) => activity.user_id === userId && (includeArchived || !activity.archived))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  const filter: Partial<HabitActivityDoc> = { user_id: userId };
  if (!includeArchived) {
    filter.archived = false;
  }

  return habitActivitiesCollection().find(filter, { sort: { created_at: 1 } }).toArray();
}

export async function findHabitActivityById(activityId: string): Promise<HabitActivityDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.habitActivities.find((activity) => activity.id === activityId);
  }
  return (await habitActivitiesCollection().findOne({ id: activityId })) ?? undefined;
}

export async function findHabitActivityByIdForUser(activityId: string, userId: string): Promise<HabitActivityDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.habitActivities.find((activity) => activity.id === activityId && activity.user_id === userId);
  }
  return (await habitActivitiesCollection().findOne({ id: activityId, user_id: userId })) ?? undefined;
}

export async function findHabitActivityConflictByName(userId: string, normalizedName: string, excludeId?: string): Promise<HabitActivityDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.habitActivities.find((activity) => activity.user_id === userId && !activity.archived && activity.name_normalized === normalizedName && activity.id !== excludeId);
  }
  const filter: Record<string, unknown> = { user_id: userId, archived: false, name_normalized: normalizedName };
  if (excludeId) {
    filter.id = { $ne: excludeId };
  }
  return (await habitActivitiesCollection().findOne(filter)) ?? undefined;
}

export async function insertHabitActivity(activity: HabitActivityDoc): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    memoryStore.habitActivities.push({ ...activity });
    return;
  }
  await habitActivitiesCollection().insertOne(activity);
}

export async function updateHabitActivity(activityId: string, patch: Partial<HabitActivityDoc>): Promise<HabitActivityDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.habitActivities.findIndex((activity) => activity.id === activityId);
    if (index === -1) {
      return undefined;
    }
    memoryStore.habitActivities[index] = { ...memoryStore.habitActivities[index], ...patch };
    return memoryStore.habitActivities[index];
  }
  const result = await habitActivitiesCollection().findOneAndUpdate(
    { id: activityId },
    { $set: patch },
    { returnDocument: "after" }
  );
  return result ?? undefined;
}

export async function findOccurrenceByActivityAndDate(activityId: string, date: string): Promise<HabitOccurrenceDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.habitOccurrences.find((occurrence) => occurrence.activity_id === activityId && occurrence.date === date);
  }
  return (await habitOccurrencesCollection().findOne({ activity_id: activityId, date })) ?? undefined;
}

export async function insertOccurrence(occurrence: HabitOccurrenceDoc): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    memoryStore.habitOccurrences.push({ ...occurrence });
    return;
  }
  await habitOccurrencesCollection().insertOne(occurrence);
}

export async function upsertPendingOccurrence(occurrence: HabitOccurrenceDoc): Promise<HabitOccurrenceDoc> {
  await initializeDatabase();
  if (mode === "memory") {
    const existing = memoryStore.habitOccurrences.find((row) => row.activity_id === occurrence.activity_id && row.date === occurrence.date);
    if (existing) {
      return existing;
    }
    memoryStore.habitOccurrences.push({ ...occurrence });
    return occurrence;
  }
  await habitOccurrencesCollection().updateOne(
    { activity_id: occurrence.activity_id, date: occurrence.date },
    {
      $setOnInsert: occurrence,
    },
    { upsert: true }
  );
  const saved = await findOccurrenceByActivityAndDate(occurrence.activity_id, occurrence.date);
  if (!saved) {
    throw new Error("[story-diary] Failed to upsert habit occurrence");
  }
  return saved;
}

export async function findOccurrenceById(occurrenceId: string): Promise<HabitOccurrenceDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.habitOccurrences.find((occurrence) => occurrence.id === occurrenceId);
  }
  return (await habitOccurrencesCollection().findOne({ id: occurrenceId })) ?? undefined;
}

export async function updateOccurrence(occurrenceId: string, patch: Partial<HabitOccurrenceDoc>): Promise<HabitOccurrenceDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.habitOccurrences.findIndex((occurrence) => occurrence.id === occurrenceId);
    if (index === -1) {
      return undefined;
    }
    memoryStore.habitOccurrences[index] = { ...memoryStore.habitOccurrences[index], ...patch };
    return memoryStore.habitOccurrences[index];
  }
  const result = await habitOccurrencesCollection().findOneAndUpdate(
    { id: occurrenceId },
    { $set: patch },
    { returnDocument: "after" }
  );
  return result ?? undefined;
}

export async function listOccurrencesByActivityAndDateRange(activityId: string, startDate: string, endDate: string): Promise<HabitOccurrenceDoc[]> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.habitOccurrences
      .filter((occurrence) => occurrence.activity_id === activityId && occurrence.date >= startDate && occurrence.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  return habitOccurrencesCollection().find(
    { activity_id: activityId, date: { $gte: startDate, $lte: endDate } },
    { sort: { date: 1 } }
  ).toArray();
}

export async function findMedicineCheckinByOccurrence(occurrenceId: string): Promise<MedicineCheckinDoc | null> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.medicineCheckins.find((c) => c.occurrence_id === occurrenceId) ?? null;
  }
  return medicineCheckinsCollection().findOne({ occurrence_id: occurrenceId });
}

export async function findNutritionCheckinByOccurrence(occurrenceId: string): Promise<NutritionCheckinDoc | null> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.nutritionCheckins.find((c) => c.occurrence_id === occurrenceId) ?? null;
  }
  return nutritionCheckinsCollection().findOne({ occurrence_id: occurrenceId });
}

export async function findSymptomsCheckinByOccurrence(occurrenceId: string): Promise<SymptomsCheckinDoc | null> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.symptomsCheckins.find((c) => c.occurrence_id === occurrenceId) ?? null;
  }
  return symptomsCheckinsCollection().findOne({ occurrence_id: occurrenceId });
}

export async function findMoodCheckinByOccurrence(occurrenceId: string): Promise<MoodCheckinDoc | null> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.moodCheckins.find((c) => c.occurrence_id === occurrenceId) ?? null;
  }
  return moodCheckinsCollection().findOne({ occurrence_id: occurrenceId });
}

export async function replaceMedicineCheckin(doc: MedicineCheckinDoc): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.medicineCheckins.findIndex((checkin) => checkin.occurrence_id === doc.occurrence_id);
    if (index === -1) {
      memoryStore.medicineCheckins.push({ ...doc });
    } else {
      memoryStore.medicineCheckins[index] = { ...doc };
    }
    return;
  }
  await medicineCheckinsCollection().replaceOne({ occurrence_id: doc.occurrence_id }, doc, { upsert: true });
}

export async function replaceNutritionCheckin(doc: NutritionCheckinDoc): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.nutritionCheckins.findIndex((checkin) => checkin.occurrence_id === doc.occurrence_id);
    if (index === -1) {
      memoryStore.nutritionCheckins.push({ ...doc });
    } else {
      memoryStore.nutritionCheckins[index] = { ...doc };
    }
    return;
  }
  await nutritionCheckinsCollection().replaceOne({ occurrence_id: doc.occurrence_id }, doc, { upsert: true });
}

export async function replaceSymptomsCheckin(doc: SymptomsCheckinDoc): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.symptomsCheckins.findIndex((checkin) => checkin.occurrence_id === doc.occurrence_id);
    if (index === -1) {
      memoryStore.symptomsCheckins.push({ ...doc });
    } else {
      memoryStore.symptomsCheckins[index] = { ...doc };
    }
    return;
  }
  await symptomsCheckinsCollection().replaceOne({ occurrence_id: doc.occurrence_id }, doc, { upsert: true });
}

export async function replaceMoodCheckin(doc: MoodCheckinDoc): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.moodCheckins.findIndex((checkin) => checkin.occurrence_id === doc.occurrence_id);
    if (index === -1) {
      memoryStore.moodCheckins.push({ ...doc });
    } else {
      memoryStore.moodCheckins[index] = { ...doc };
    }
    return;
  }
  await moodCheckinsCollection().replaceOne({ occurrence_id: doc.occurrence_id }, doc, { upsert: true });
}

export async function listQuizQuestionsDocs(): Promise<QuizQuestionDoc[]> {
  await initializeDatabase();
  if (mode === "memory") {
    return [...memoryStore.quizQuestions].sort((a, b) => a.sort_order - b.sort_order);
  }
  return quizQuestionsCollection().find({}, { sort: { sort_order: 1 } }).toArray();
}

export async function reorderQuizQuestionDocs(orderedIds: string[]): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    orderedIds.forEach((id, index) => {
      const q = memoryStore.quizQuestions.find((r) => r.id === id);
      if (q) q.sort_order = index + 1;
    });
    return;
  }
  await quizQuestionsCollection().bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: { filter: { id }, update: { $set: { sort_order: index + 1 } } },
    }))
  );
}

export async function insertQuizAttempt(doc: QuizAttemptDoc): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    memoryStore.quizAttempts.push({ ...doc });
    return;
  }
  await quizAttemptsCollection().insertOne(doc);
}

export async function listEBooksDocs(): Promise<EBookDoc[]> {
  await initializeDatabase();
  if (mode === "memory") {
    return [...memoryStore.eBooks].sort((a, b) => a.sort_order - b.sort_order);
  }
  return eBooksCollection().find({}, { sort: { sort_order: 1 } }).toArray();
}

// ── Admin: Chapter CRUD ───────────────────────────────────────────────────────

export async function getNextChapterId(): Promise<number> {
  await initializeDatabase();
  if (mode === "memory") {
    const max = memoryStore.chapters.reduce((m, c) => Math.max(m, c.id), 0);
    return max + 1;
  }
  const last = await chaptersCollection().findOne({}, { sort: { id: -1 } });
  return (last?.id ?? 0) + 1;
}

export async function insertChapterDoc(chapter: ChapterDoc): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    memoryStore.chapters.push({ ...chapter });
    return;
  }
  await chaptersCollection().insertOne(chapter);
}

export async function updateChapterDoc(id: number, patch: Partial<ChapterDoc>): Promise<ChapterDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.chapters.findIndex((c) => c.id === id);
    if (index === -1) return undefined;
    memoryStore.chapters[index] = { ...memoryStore.chapters[index], ...patch };
    return memoryStore.chapters[index];
  }
  const result = await chaptersCollection().findOneAndUpdate(
    { id },
    { $set: patch },
    { returnDocument: "after" }
  );
  return result ?? undefined;
}

export async function deleteChapterDoc(id: number): Promise<boolean> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.chapters.findIndex((c) => c.id === id);
    if (index === -1) return false;
    memoryStore.chapters.splice(index, 1);
    return true;
  }
  const result = await chaptersCollection().deleteOne({ id });
  return result.deletedCount > 0;
}

export async function reorderChapterDocs(orderedIds: number[]): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    orderedIds.forEach((id, index) => {
      const chapter = memoryStore.chapters.find((c) => c.id === id);
      if (chapter) chapter.sort_order = index + 1;
    });
    return;
  }
  await chaptersCollection().bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: { filter: { id }, update: { $set: { sort_order: index + 1 } } },
    }))
  );
}

// ── Admin: EBook CRUD ─────────────────────────────────────────────────────────

export async function insertEBookDoc(ebook: EBookDoc): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    memoryStore.eBooks.push({ ...ebook });
    return;
  }
  await eBooksCollection().insertOne(ebook);
}

export async function updateEBookDoc(id: string, patch: Partial<EBookDoc>): Promise<EBookDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.eBooks.findIndex((e) => e.id === id);
    if (index === -1) return undefined;
    memoryStore.eBooks[index] = { ...memoryStore.eBooks[index], ...patch };
    return memoryStore.eBooks[index];
  }
  const result = await eBooksCollection().findOneAndUpdate(
    { id },
    { $set: patch },
    { returnDocument: "after" }
  );
  return result ?? undefined;
}

export async function deleteEBookDoc(id: string): Promise<boolean> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.eBooks.findIndex((e) => e.id === id);
    if (index === -1) return false;
    memoryStore.eBooks.splice(index, 1);
    return true;
  }
  const result = await eBooksCollection().deleteOne({ id });
  return result.deletedCount > 0;
}

export async function reorderEBookDocs(orderedIds: string[]): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    orderedIds.forEach((id, index) => {
      const ebook = memoryStore.eBooks.find((e) => e.id === id);
      if (ebook) ebook.sort_order = index + 1;
    });
    return;
  }
  await eBooksCollection().bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: { filter: { id }, update: { $set: { sort_order: index + 1 } } },
    }))
  );
}

// ── Admin: Quiz Question CRUD ─────────────────────────────────────────────────

export async function findQuizQuestionById(id: string): Promise<QuizQuestionDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.quizQuestions.find((q) => q.id === id);
  }
  return (await quizQuestionsCollection().findOne({ id })) ?? undefined;
}

export async function insertQuizQuestionDoc(question: QuizQuestionDoc): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    memoryStore.quizQuestions.push({ ...question });
    return;
  }
  await quizQuestionsCollection().insertOne(question);
}

export async function updateQuizQuestionDoc(id: string, patch: Partial<QuizQuestionDoc>): Promise<QuizQuestionDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.quizQuestions.findIndex((q) => q.id === id);
    if (index === -1) return undefined;
    memoryStore.quizQuestions[index] = { ...memoryStore.quizQuestions[index], ...patch };
    return memoryStore.quizQuestions[index];
  }
  const result = await quizQuestionsCollection().findOneAndUpdate(
    { id },
    { $set: patch },
    { returnDocument: "after" }
  );
  return result ?? undefined;
}

export async function deleteQuizQuestionDoc(id: string): Promise<boolean> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.quizQuestions.findIndex((q) => q.id === id);
    if (index === -1) return false;
    memoryStore.quizQuestions.splice(index, 1);
    return true;
  }
  const result = await quizQuestionsCollection().deleteOne({ id });
  return result.deletedCount > 0;
}

// ── Admin: Chapter Scene CRUD ─────────────────────────────────────────────────

export async function insertChapterSceneDoc(scene: ChapterSceneDoc): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    memoryStore.chapterScenes.push({ ...scene });
    return;
  }
  await chapterScenesCollection().insertOne(scene);
}

export async function updateChapterSceneDoc(id: string, patch: Partial<ChapterSceneDoc>): Promise<ChapterSceneDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.chapterScenes.findIndex((s) => s.id === id);
    if (index === -1) return undefined;
    memoryStore.chapterScenes[index] = { ...memoryStore.chapterScenes[index], ...patch };
    return memoryStore.chapterScenes[index];
  }
  const result = await chapterScenesCollection().findOneAndUpdate(
    { id },
    { $set: patch },
    { returnDocument: "after" }
  );
  return result ?? undefined;
}

export async function deleteChapterSceneDoc(id: string): Promise<boolean> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.chapterScenes.findIndex((s) => s.id === id);
    if (index === -1) return false;
    memoryStore.chapterScenes.splice(index, 1);
    return true;
  }
  const result = await chapterScenesCollection().deleteOne({ id });
  return result.deletedCount > 0;
}

export async function reorderChapterSceneDocs(chapterId: number, orderedIds: string[]): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    orderedIds.forEach((id, index) => {
      const scene = memoryStore.chapterScenes.find((s) => s.id === id);
      if (scene) scene.idx = index;
    });
    return;
  }
  // Two-pass update to avoid unique-index conflicts on (chapter_id, idx):
  // pass 1 sets large temporary idx values, pass 2 sets final 0-based values.
  const OFFSET = 100_000;
  await chapterScenesCollection().bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: { filter: { id, chapter_id: chapterId }, update: { $set: { idx: OFFSET + index } } },
    }))
  );
  await chapterScenesCollection().bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: { filter: { id, chapter_id: chapterId }, update: { $set: { idx: index } } },
    }))
  );
}

// ── Video Clip CRUD ───────────────────────────────────────────────────────────

export async function listVideoClipsDocs(): Promise<VideoClipDoc[]> {
  await initializeDatabase();
  if (mode === "memory") {
    return [...memoryStore.videoClips].sort((a, b) => a.sort_order - b.sort_order);
  }
  return videoClipsCollection().find({}, { sort: { sort_order: 1 } }).toArray();
}

export async function findVideoClipById(id: string): Promise<VideoClipDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    return memoryStore.videoClips.find((c) => c.id === id);
  }
  return (await videoClipsCollection().findOne({ id })) ?? undefined;
}

export async function insertVideoClipDoc(clip: VideoClipDoc): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    memoryStore.videoClips.push({ ...clip });
    return;
  }
  await videoClipsCollection().insertOne(clip);
}

export async function updateVideoClipDoc(id: string, patch: Partial<VideoClipDoc>): Promise<VideoClipDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.videoClips.findIndex((c) => c.id === id);
    if (index === -1) return undefined;
    memoryStore.videoClips[index] = { ...memoryStore.videoClips[index], ...patch };
    return memoryStore.videoClips[index];
  }
  const result = await videoClipsCollection().findOneAndUpdate(
    { id },
    { $set: patch },
    { returnDocument: "after" }
  );
  return result ?? undefined;
}

export async function deleteVideoClipDoc(id: string): Promise<boolean> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.videoClips.findIndex((c) => c.id === id);
    if (index === -1) return false;
    memoryStore.videoClips.splice(index, 1);
    return true;
  }
  const result = await videoClipsCollection().deleteOne({ id });
  return result.deletedCount > 0;
}

export async function reorderVideoClipDocs(orderedIds: string[]): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    orderedIds.forEach((id, index) => {
      const clip = memoryStore.videoClips.find((c) => c.id === id);
      if (clip) clip.sort_order = index + 1;
    });
    return;
  }
  await videoClipsCollection().bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: { filter: { id }, update: { $set: { sort_order: index + 1 } } },
    }))
  );
}
