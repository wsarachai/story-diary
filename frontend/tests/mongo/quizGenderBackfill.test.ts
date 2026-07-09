/**
 * Mongo-mode migration test — per-gender quiz split backfill.
 *
 * Simulates an un-migrated database: legacy `quiz_questions` docs that predate
 * the `gender` field are inserted via a raw client BEFORE the app's
 * `initializeDatabase()` runs. We then assert the on-init backfill
 * (backfillQuizQuestionGenders in lib/db.ts):
 *   - assigns gender="male" to legacy docs, preserving their (possibly edited)
 *     content;
 *   - clones the current male set into a female set, deriving female ids via
 *     femaleQuestionId (numbered → qfN, otherwise "<id>-f");
 *   - is idempotent — re-initializing does not duplicate the female set.
 *
 * Runs on a real mongod booted by tests/mongo/setup.ts.
 *
 * Run with: pnpm test:mongo
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient, type Collection } from "mongodb";
import { femaleQuestionId } from "@/lib/db";

const DB_NAME = "story-diary";

interface LegacyQuizDoc {
  id: string;
  sort_order: number;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string | null;
  gender?: "male" | "female";
}

function legacyDoc(id: string, sort_order: number, text: string): LegacyQuizDoc {
  return {
    id,
    sort_order,
    text,
    option_a: "a",
    option_b: "b",
    option_c: "c",
    option_d: "d",
    correct_answer: "A",
    explanation: null,
  };
}

describe("mongo migration: legacy quiz docs get a gender + female clones", () => {
  let raw: MongoClient;
  let col: Collection<LegacyQuizDoc>;

  beforeAll(async () => {
    // Seed the un-migrated state directly, before the app connects.
    raw = new MongoClient(process.env.MONGODB_URI as string);
    await raw.connect();
    col = raw.db(DB_NAME).collection<LegacyQuizDoc>("quiz_questions");
    await col.deleteMany({});
    await col.insertMany([
      // An admin-edited seed question (no gender): edit must survive + clone.
      legacyDoc("q1", 1, "EDITED legacy q1"),
      // An admin-added question with a non-numbered id: exercises the "-f" fallback.
      legacyDoc("legacy-extra", 99, "admin added question"),
    ]);

    // Boot the app DB layer → runs ensureIndexes + seed (male) + backfill.
    const { initializeDatabase } = await import("@/lib/db");
    await initializeDatabase();
  });

  afterAll(async () => {
    await raw.close();
  });

  it("assigns gender=male to legacy docs and preserves their content", async () => {
    const q1 = await col.findOne({ id: "q1" });
    expect(q1?.gender).toBe("male");
    expect(q1?.text).toBe("EDITED legacy q1");

    const extra = await col.findOne({ id: "legacy-extra" });
    expect(extra?.gender).toBe("male");
    expect(extra?.text).toBe("admin added question");
  });

  it("clones a female counterpart for each male question, preserving edits", async () => {
    // Numbered id → qf1, cloned from the CURRENT (edited) male content.
    const qf1 = await col.findOne({ id: femaleQuestionId("q1") });
    expect(qf1?.id).toBe("qf1");
    expect(qf1?.gender).toBe("female");
    expect(qf1?.text).toBe("EDITED legacy q1");

    // Non-numbered id → "<id>-f" fallback.
    const extraFemale = await col.findOne({ id: femaleQuestionId("legacy-extra") });
    expect(extraFemale?.id).toBe("legacy-extra-f");
    expect(extraFemale?.gender).toBe("female");
    expect(extraFemale?.text).toBe("admin added question");
  });

  it("produces matching male/female set sizes with no gender-less docs left", async () => {
    const missingGender = await col.countDocuments({ gender: { $exists: false } });
    expect(missingGender).toBe(0);

    const male = await col.countDocuments({ gender: "male" });
    const female = await col.countDocuments({ gender: "female" });
    // Seed fills q2..q13; legacy q1 + legacy-extra bring male to 14; female mirrors it.
    expect(male).toBe(14);
    expect(female).toBe(14);
  });

  it("is idempotent — re-initializing does not duplicate the female set", async () => {
    const femaleBefore = await col.countDocuments({ gender: "female" });

    const { initializeDatabase, closeDatabase } = await import("@/lib/db");
    await closeDatabase();
    await initializeDatabase();

    const femaleAfter = await col.countDocuments({ gender: "female" });
    expect(femaleAfter).toBe(femaleBefore);
  });
});
