/**
 * One-off content fix for chapter 1 after the 2026-10 character art drop:
 *  - ภูติน้อย (scenes 21–43) used the blue-flame art → its own expressions.
 *  - "???" (scenes 12–18, the fairy before it is named) used the good-goddess
 *    art → the mist silhouette.
 *  - ชาวบ้าน B (9, 40) used villager A / goddess art → its own art.
 *  - ชาวบ้าน A scene 8 complains of feeling weak → the "sick" art.
 *  - Main-actor scenes get a starting expression from their line.
 *
 * Every change is guarded by the scene's current speaker and a text prefix,
 * so an edited script is skipped (and reported) instead of overwritten.
 *
 * Usage (from frontend/):
 *   node scripts/seed-chapter1-character-art.mjs           # dry run: print the plan
 *   node scripts/seed-chapter1-character-art.mjs --apply   # write it
 *
 * Run --apply only after the art is deployed (the URLs must resolve).
 */

import { MongoClient, ServerApiVersion } from "mongodb";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");
const CHAPTER_ID = 1;
const IMG = (name) => `/images/characters/${name}`;

const FAIRY = {
  normal: IMG("fairy-normal-560x720.png"),
  shocked: IMG("fairy-shocked-560x720.png"),
  confused: IMG("fairy-confused-560x720.png"),
  worried: IMG("fairy-worried-560x720.png"),
  determined: IMG("fairy-determined-560x720.png"),
  happy: IMG("fairy-happy-560x720.png"),
  unknown: IMG("fairy-unknown-560x720.png"),
};

/**
 * idx → expected speaker, text prefix (guard), and the change to make.
 * Main-actor rows set `expression`; other rows set `image`.
 */
const PLAN = [
  // Main actor ("ผู้กล้า") — starting expressions from each line.
  { idx: 3, speaker: "ผู้กล้า", text: "(ทำไมช่วงนี้", expression: "sick" },
  { idx: 4, speaker: "ผู้กล้า", text: "*แค่ก", expression: "sick" },
  { idx: 5, speaker: "ผู้กล้า", text: "“แค่ลุกขึ้น", expression: "sick" },
  { idx: 6, speaker: "ผู้กล้า", text: "“หรือจะเกี่ยว", expression: "curious" },
  { idx: 7, speaker: "ผู้กล้า", text: "“หมอกนี่", expression: "scared" },
  { idx: 10, speaker: "ผู้กล้า", text: "(ทุกคนก็เป็น", expression: "curious" },
  { idx: 13, speaker: "ผู้กล้า", text: "“เอ๊ะ!? นั้นใคร", expression: "shocked" },
  { idx: 15, speaker: "ผู้กล้า", text: "“เธอเป็นตัวอะไร", expression: "curious" },
  { idx: 17, speaker: "ผู้กล้า", text: "“แล้วเธอ ชื่อ", expression: "normal" },
  { idx: 19, speaker: "ผู้กล้า", text: "\"งั้นฉันเรียกเธอ", expression: "smile" },
  { idx: 20, speaker: "ผู้กล้า", text: "“ว่าแต่ภูติน้อย", expression: "curious" },
  { idx: 23, speaker: "ผู้กล้า", text: "“ช่วย…ฉัน?", expression: "curious" },
  { idx: 25, speaker: "ผู้กล้า", text: "“……", expression: "scared" },
  { idx: 29, speaker: "ผู้กล้า", text: "“เรายังไม่พร้อม", expression: "scared" },
  { idx: 31, speaker: "ผู้กล้า", text: "“งั้นเราจะช่วย", expression: "determined" },
  { idx: 32, speaker: "ผู้กล้า", text: "“ก็ถ้าไม่มีใคร", expression: "determined" },
  { idx: 35, speaker: "ผู้กล้า", text: "“ที่ไหน?", expression: "curious" },
  { idx: 38, speaker: "ผู้กล้า", text: "“งั้นเราไป", expression: "determined" },
  { idx: 42, speaker: "ผู้กล้า", text: "“ยังกลัว", expression: "scared" },

  // Villagers.
  { idx: 8, speaker: "ชาวบ้าน A", text: "“ช่วงนี้ไม่ไหว", image: IMG("villager-a-sick-522x720.png") },
  { idx: 9, speaker: "ชาวบ้าน B", text: "“ฉันก็เหมือนกัน", image: IMG("villager-b-sick-540x720.png") },
  { idx: 40, speaker: "ชาวบ้าน B", text: "“ฝากความหวัง", image: IMG("villager-b-normal-540x720.png") },

  // "???" — the fairy before it is named: mist silhouette.
  { idx: 12, speaker: "???", text: "“อ๊ะ!?", image: FAIRY.unknown },
  { idx: 14, speaker: "???", text: "“เดี๋ยวนะ", image: FAIRY.unknown },
  { idx: 16, speaker: "???", text: "“เอ๊ะ!? นั่นสิ", image: FAIRY.unknown },
  { idx: 18, speaker: "???", text: "“ชื่อเหรอ", image: FAIRY.unknown },

  // ภูติน้อย — expressions from each line.
  { idx: 21, speaker: "ภูติน้อย", text: "“หมอกงั้นเหรอ", image: FAIRY.worried },
  { idx: 22, speaker: "ภูติน้อย", text: "“ถึงจะจำ", image: FAIRY.determined },
  { idx: 24, speaker: "ภูติน้อย", text: "“ใช่! ฉันรู้สึก", image: FAIRY.worried },
  { idx: 26, speaker: "ภูติน้อย", text: "“แล้วก็…ไม่ใช่", image: FAIRY.worried },
  { idx: 28, speaker: "ภูติน้อย", text: "“ถ้าเราปล่อย", image: FAIRY.worried },
  { idx: 30, speaker: "ภูติน้อย", text: "“ไม่เป็นไร", image: FAIRY.normal },
  { idx: 33, speaker: "ภูติน้อย", text: "“ฉันรู้ว่าเธอ", image: FAIRY.happy },
  { idx: 34, speaker: "ภูติน้อย", text: "“ฉันจำได้ลาง", image: FAIRY.confused },
  { idx: 36, speaker: "ภูติน้อย", text: "“หอคอย", image: FAIRY.determined },
  { idx: 41, speaker: "ภูติน้อย", text: "“พร้อมไหม", image: FAIRY.normal },
  { idx: 43, speaker: "ภูติน้อย", text: "\"ไม่ว่าจะกลัว", image: FAIRY.determined },
];

// ── env / connection (same conventions as the migrate-*.mjs scripts) ─────────
function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  try {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (key && val && !process.env[key]) process.env[key] = val;
    }
  } catch {
    console.warn("No .env.local found — relying on existing env vars.");
  }
}

function buildUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const username = encodeURIComponent(process.env.MONGODB_USERNAME ?? "");
  const password = encodeURIComponent(process.env.MONGODB_PASSWORD ?? "");
  const host = process.env.MONGODB_CLUSTER_HOST ?? "cluster0.563g7gd.mongodb.net";
  const query = process.env.MONGODB_QUERY ?? "retryWrites=true&w=majority&appName=Cluster0";
  const dbName = encodeURIComponent(process.env.MONGODB_DB_NAME ?? "story-diary");
  if (!username || !password) {
    throw new Error("Missing MONGODB_URI or MONGODB_USERNAME/MONGODB_PASSWORD in .env.local");
  }
  return `mongodb+srv://${username}:${password}@${host}/${dbName}?${query}`;
}

const short = (url) => (url ? url.split("/").pop() : "—");

async function run() {
  loadEnv();
  const client = new MongoClient(buildUri(), {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  });
  try {
    await client.connect();
    const scenes = client.db(process.env.MONGODB_DB_NAME?.trim() || "story-diary").collection("chapter_scenes");
    const rows = await scenes.find({ chapter_id: CHAPTER_ID }).toArray();
    const byIdx = new Map(rows.map((r) => [r.idx, r]));

    const updates = [];
    const skipped = [];
    for (const step of PLAN) {
      const row = byIdx.get(step.idx);
      const speaker = row?.actor_kind === "main" ? "ผู้กล้า" : row?.speaker_name;
      if (!row || speaker !== step.speaker || !row.text.startsWith(step.text)) {
        skipped.push(`  #${step.idx}: expected ${step.speaker} "${step.text}…", found ${speaker ?? "nothing"} "${row?.text.slice(0, 20) ?? ""}"`);
        continue;
      }
      if (step.expression !== undefined) {
        const next = step.expression === "normal" ? null : step.expression;
        if ((row.actor_expression ?? null) === next) continue;
        updates.push({ id: row.id, set: { actor_expression: next }, note: `#${step.idx} ผู้กล้า  expression ${row.actor_expression ?? "normal"} → ${step.expression}` });
      } else {
        if (row.speaker_image_url === step.image) continue;
        updates.push({ id: row.id, set: { speaker_image_url: step.image }, note: `#${step.idx} ${step.speaker}  ${short(row.speaker_image_url)} → ${short(step.image)}` });
      }
    }

    console.log(`${APPLY ? "Applying" : "Dry run —"} ${updates.length} change(s) to chapter ${CHAPTER_ID}:`);
    for (const u of updates) console.log(`  ${u.note}`);
    if (skipped.length) {
      console.log(`Skipped ${skipped.length} scene(s) whose speaker/text no longer match:`);
      for (const s of skipped) console.log(s);
    }
    if (!APPLY) {
      console.log("\nNothing written. Re-run with --apply to write these changes.");
      return;
    }
    for (const u of updates) await scenes.updateOne({ id: u.id }, { $set: u.set });
    console.log(`Done. Updated ${updates.length} scene(s).`);
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
