/**
 * SQLite database connection, schema migrations, and seed data.
 * Uses better-sqlite3 for synchronous access (safe in single-process Node).
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DB_DIR, "story-diary.db");

// Ensure the data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db: Database.Database = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ──────────────────────────────────────────────────────────────────────────
// Schema migrations
// ──────────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    email        TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    character_name TEXT NOT NULL,
    gender       TEXT NOT NULL CHECK(gender IN ('male', 'female')),
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chapters (
    id                   INTEGER PRIMARY KEY,
    title                TEXT NOT NULL,
    intro_title          TEXT NOT NULL DEFAULT 'บทบรรยาย',
    background_image_url TEXT,
    lock_state           TEXT NOT NULL DEFAULT 'locked'
                         CHECK(lock_state IN ('unlocked', 'locked')),
    sort_order           INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chapter_scenes (
    id               TEXT PRIMARY KEY,
    chapter_id       INTEGER NOT NULL REFERENCES chapters(id),
    idx              INTEGER NOT NULL,
    speaker_name     TEXT NOT NULL,
    speaker_image_url TEXT,
    text             TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_chapter_progress (
    user_id    TEXT NOT NULL REFERENCES users(id),
    chapter_id INTEGER NOT NULL REFERENCES chapters(id),
    progress   TEXT NOT NULL DEFAULT 'not-started'
               CHECK(progress IN ('not-started', 'in-progress', 'completed')),
    PRIMARY KEY (user_id, chapter_id)
  );

  CREATE TABLE IF NOT EXISTS habit_activities (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL REFERENCES users(id),
    category         TEXT NOT NULL CHECK(category IN ('medicine', 'nutrition', 'physical')),
    physical_category TEXT,
    name             TEXT NOT NULL,
    icon_color       TEXT,
    schedule_json    TEXT NOT NULL,
    meal_relation    TEXT CHECK(meal_relation IN ('before', 'after')),
    meal_slots_json  TEXT,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    archived         INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS habit_occurrences (
    id           TEXT PRIMARY KEY,
    activity_id  TEXT NOT NULL REFERENCES habit_activities(id),
    date         TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK(status IN ('pending', 'done', 'skipped')),
    completed_at TEXT,
    UNIQUE(activity_id, date)
  );

  CREATE TABLE IF NOT EXISTS quiz_questions (
    id             TEXT PRIMARY KEY,
    number         INTEGER NOT NULL,
    text           TEXT NOT NULL,
    option_a       TEXT NOT NULL,
    option_b       TEXT NOT NULL,
    option_c       TEXT NOT NULL,
    option_d       TEXT NOT NULL,
    correct_answer TEXT NOT NULL CHECK(correct_answer IN ('A', 'B', 'C', 'D')),
    explanation    TEXT
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id),
    quiz_id      TEXT NOT NULL,
    started_at   TEXT NOT NULL,
    completed_at TEXT,
    score_points INTEGER,
    score_correct INTEGER,
    answers_json TEXT
  );

  CREATE TABLE IF NOT EXISTS medicine_checkins (
    id              TEXT PRIMARY KEY,
    occurrence_id   TEXT NOT NULL REFERENCES habit_occurrences(id),
    medicine_name   TEXT NOT NULL,
    meal_relation   TEXT NOT NULL,
    meal_slots_json TEXT NOT NULL,
    side_effects_json TEXT NOT NULL,
    created_at      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS nutrition_checkins (
    id            TEXT PRIMARY KEY,
    occurrence_id TEXT NOT NULL REFERENCES habit_occurrences(id),
    activity_name TEXT NOT NULL,
    breakfast     TEXT NOT NULL DEFAULT '',
    lunch         TEXT NOT NULL DEFAULT '',
    dinner        TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS symptoms_checkins (
    id            TEXT PRIMARY KEY,
    occurrence_id TEXT NOT NULL REFERENCES habit_occurrences(id),
    items_json    TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mood_checkins (
    id            TEXT PRIMARY KEY,
    occurrence_id TEXT NOT NULL REFERENCES habit_occurrences(id),
    mood          TEXT NOT NULL,
    slider_value  INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
  );
`);

// ──────────────────────────────────────────────────────────────────────────
// Seed data
// ──────────────────────────────────────────────────────────────────────────

const chapterCount = (db.prepare("SELECT COUNT(*) as c FROM chapters").get() as { c: number }).c;

if (chapterCount === 0) {
  // Seed chapters 1–5 (chapter 1 unlocked, 2–5 locked)
  const insertChapter = db.prepare(
    "INSERT INTO chapters (id, title, intro_title, lock_state, sort_order) VALUES (?, ?, ?, ?, ?)"
  );
  const insertScene = db.prepare(
    "INSERT INTO chapter_scenes (id, chapter_id, idx, speaker_name, text) VALUES (?, ?, ?, ?, ?)"
  );

  const seedChapters = db.transaction(() => {
    insertChapter.run(1, "บทที่ 1: เริ่มต้นการเดินทาง", "บทบรรยาย", "unlocked", 1);
    insertChapter.run(2, "บทที่ 2: การเรียนรู้", "บทบรรยาย", "locked", 2);
    insertChapter.run(3, "บทที่ 3: ความท้าทาย", "บทบรรยาย", "locked", 3);
    insertChapter.run(4, "บทที่ 4: การเติบโต", "บทบรรยาย", "locked", 4);
    insertChapter.run(5, "บทที่ 5: บทสรุป", "บทบรรยาย", "locked", 5);

    // Scenes for chapter 1
    insertScene.run("c1s0", 1, 0, "ผู้บรรยาย",
      "ยินดีต้อนรับสู่ Story Diary — บันทึกการเดินทางสุขภาพของคุณ\nวันนี้เราจะเริ่มต้นก้าวแรกด้วยกัน");
    insertScene.run("c1s1", 1, 1, "ชื่อตัวละคร",
      "สวัสดี! ฉันชื่อ... ยังไม่รู้จะตั้งชื่ออะไรดี แต่ฉันพร้อมแล้วที่จะดูแลสุขภาพ");
    insertScene.run("c1s2", 1, 2, "ผู้บรรยาย",
      "การดูแลสุขภาพไม่ใช่เรื่องยาก เพียงแค่เริ่มต้นทีละก้าว\nบันทึกกิจกรรมประจำวัน ติดตามความก้าวหน้า และสนุกกับการเรียนรู้");
    insertScene.run("c1s3", 1, 3, "ชื่อตัวละคร",
      "ฉันจะลองดู! เริ่มจากการบันทึกยาที่ต้องทานและอาหารในแต่ละวัน");
    insertScene.run("c1s4", 1, 4, "ผู้บรรยาย",
      "ยอดเยี่ยมมาก! ไปดูกันเลยว่ามีอะไรรออยู่บ้างในการเดินทางครั้งนี้");
  });

  seedChapters();
}

// Seed quiz questions
const quizCount = (db.prepare("SELECT COUNT(*) as c FROM quiz_questions").get() as { c: number }).c;

if (quizCount === 0) {
  const insertQ = db.prepare(`
    INSERT INTO quiz_questions (id, number, text, option_a, option_b, option_c, option_d, correct_answer, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedQuiz = db.transaction(() => {
    insertQ.run("q1", 1,
      "ควรหลีกเลี่ยงแสงแดดในช่วงเวลาใดเพื่อป้องกันผิวหนังจากแสงยูวี?",
      "06:00 – 09:00 น.", "10:00 – 16:00 น.", "16:00 – 18:00 น.", "18:00 – 20:00 น.",
      "B", "แสงยูวีจะรุนแรงที่สุดในช่วง 10:00 – 16:00 น."
    );
    insertQ.run("q2", 2,
      "อาหารประเภทใดมีประโยชน์ต่อสุขภาพหัวใจมากที่สุด?",
      "อาหารทอดและไขมันสูง", "ผักและผลไม้สด", "ขนมหวานและน้ำตาล", "เครื่องดื่มแอลกอฮอล์",
      "B", "ผักและผลไม้สดมีวิตามิน แร่ธาตุ และเส้นใยอาหารที่ดีต่อหัวใจ"
    );
    insertQ.run("q3", 3,
      "ควรออกกำลังกายอย่างน้อยกี่นาทีต่อวันสำหรับผู้ใหญ่ที่มีสุขภาพดี?",
      "10 นาที", "20 นาที", "30 นาที", "60 นาที",
      "C", "WHO แนะนำให้ออกกำลังกายระดับปานกลางอย่างน้อย 30 นาทีต่อวัน"
    );
    insertQ.run("q4", 4,
      "น้ำดื่มที่ร่างกายต้องการต่อวันโดยประมาณเท่าไร?",
      "500 มล.", "1 ลิตร", "1.5 – 2 ลิตร", "3 ลิตร",
      "C", "ร่างกายต้องการน้ำ 1.5–2 ลิตรต่อวัน หรือประมาณ 8 แก้ว"
    );
    insertQ.run("q5", 5,
      "ข้อใดเป็นอาการเตือนของโรคเบาหวาน?",
      "ปวดหัว และไข้", "ปัสสาวะบ่อย กระหายน้ำมาก และอ่อนเพลีย",
      "ปวดข้อและผิวหนังอักเสบ", "ไอและเจ็บคอ",
      "B", "อาการของโรคเบาหวาน ได้แก่ ปัสสาวะบ่อย กระหายน้ำมาก และอ่อนเพลียผิดปกติ"
    );
    insertQ.run("q6", 6,
      "การนอนหลับที่เพียงพอสำหรับผู้ใหญ่คือกี่ชั่วโมงต่อคืน?",
      "4 – 5 ชั่วโมง", "5 – 6 ชั่วโมง", "7 – 9 ชั่วโมง", "10 – 12 ชั่วโมง",
      "C", "ผู้ใหญ่ควรนอนหลับ 7–9 ชั่วโมงต่อคืนเพื่อสุขภาพที่ดี"
    );
    insertQ.run("q7", 7,
      "วิตามินดีได้รับจากแหล่งใดเป็นหลัก?",
      "อาหารทะเล", "แสงแดด", "ผักใบเขียว", "นม",
      "B", "ร่างกายสังเคราะห์วิตามินดีได้จากแสงแดด"
    );
    insertQ.run("q8", 8,
      "ค่าดัชนีมวลกาย (BMI) ปกติสำหรับผู้ใหญ่คือเท่าใด?",
      "น้อยกว่า 15", "15 – 17.9", "18.5 – 24.9", "25 – 30",
      "C", "BMI ปกติอยู่ที่ 18.5 – 24.9 กก./ม²"
    );
    insertQ.run("q9", 9,
      "การล้างมือที่ถูกวิธีควรใช้เวลานานเท่าใด?",
      "5 วินาที", "10 วินาที", "20 วินาที", "1 นาที",
      "C", "ควรล้างมือนาน 20 วินาที หรือร้องเพลงวันเกิดสองรอบ"
    );
    insertQ.run("q10", 10,
      "ข้อใดเป็นสัญญาณเตือนของโรคหลอดเลือดสมอง (Stroke)?",
      "ปวดท้องและคลื่นไส้", "ใบหน้าเบี้ยว แขนอ่อนแรง และพูดไม่ชัด",
      "ผื่นคันตามผิวหนัง", "ไอเรื้อรังและเจ็บหน้าอก",
      "B", "F.A.S.T.: ใบหน้า (Face) แขน (Arms) การพูด (Speech) และเวลา (Time)"
    );
    insertQ.run("q11", 11,
      "ธาตุเหล็กพบมากในอาหารประเภทใด?",
      "ข้าวและแป้ง", "เนื้อสัตว์สีแดงและผักใบเขียวเข้ม", "ผลไม้รสหวาน", "นมและผลิตภัณฑ์นม",
      "B", "ธาตุเหล็กพบมากในเนื้อสัตว์สีแดง ตับ และผักใบเขียวเข้ม เช่น ผักโขม"
    );
    insertQ.run("q12", 12,
      "ความดันโลหิตปกติสำหรับผู้ใหญ่ควรอยู่ที่เท่าใด?",
      "น้อยกว่า 80/50 มม.ปรอท", "120/80 มม.ปรอท หรือต่ำกว่า",
      "140/90 มม.ปรอท", "160/100 มม.ปรอท",
      "B", "ความดันโลหิตปกติอยู่ที่ 120/80 มม.ปรอทหรือต่ำกว่า"
    );
    insertQ.run("q13", 13,
      "การสูบบุหรี่เพิ่มความเสี่ยงต่อโรคใดมากที่สุด?",
      "โรคผิวหนัง", "โรคปอดและโรคหัวใจ", "โรคข้อเข่าเสื่อม", "โรคกระดูกพรุน",
      "B", "การสูบบุหรี่เป็นปัจจัยเสี่ยงหลักของมะเร็งปอด โรคปอดอุดกั้นเรื้อรัง และโรคหัวใจ"
    );
  });

  seedQuiz();
}

export default db;
