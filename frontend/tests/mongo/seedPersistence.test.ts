/**
 * Mongo-mode regression test — admin deletions must survive cold starts.
 *
 * lib/db.ts used to re-run reference-data seeding on every
 * initializeDatabase() — i.e. on every serverless cold start — so questions
 * (and chapters/e-books/video clips) deleted via the admin UI reappeared as
 * soon as another request was served by a fresh instance. Seeding is now
 * gated on the seed_state collection (runOncePerDatabase) and runs at most
 * once per database.
 *
 * Runs on a real mongod booted by tests/mongo/setup.ts.
 *
 * Run with: pnpm test:mongo
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient } from "mongodb";

const DB_NAME = "story-diary";

/** Simulate a new serverless instance: reset the init flag and reconnect. */
async function simulateColdStart() {
  const { closeDatabase, initializeDatabase } = await import("@/lib/db");
  await closeDatabase();
  await initializeDatabase();
}

describe("mongo: admin deletions survive re-initialization (cold start)", () => {
  let raw: MongoClient;

  beforeAll(async () => {
    raw = new MongoClient(process.env.MONGODB_URI as string);
    await raw.connect();
    const { initializeDatabase } = await import("@/lib/db");
    await initializeDatabase();
  });

  afterAll(async () => {
    await raw.close();
  });

  it("first init seeds the reference data exactly once", async () => {
    const db = raw.db(DB_NAME);
    expect(await db.collection("quiz_questions").findOne({ id: "q13" })).not.toBeNull();
    expect(await db.collection("quiz_questions").findOne({ id: "qf13" })).not.toBeNull();
    expect(await db.collection("e_books").findOne({ id: "ebk-5" })).not.toBeNull();
  });

  it("does not resurrect a deleted seed quiz question on re-init", async () => {
    const col = raw.db(DB_NAME).collection("quiz_questions");
    await col.deleteMany({ id: { $in: ["q13", "qf13"] } });
    expect(await col.findOne({ id: "q13" })).toBeNull();

    await simulateColdStart();

    expect(await col.findOne({ id: "q13" })).toBeNull();
    expect(await col.findOne({ id: "qf13" })).toBeNull();
  });

  it("does not resurrect a deleted seed e-book or chapter on re-init", async () => {
    const db = raw.db(DB_NAME);
    await db.collection("e_books").deleteOne({ id: "ebk-5" });
    await db.collection("chapters").deleteOne({ id: 5 });

    await simulateColdStart();

    expect(await db.collection("e_books").findOne({ id: "ebk-5" })).toBeNull();
    expect(await db.collection("chapters").findOne({ id: 5 })).toBeNull();
  });

  it("does not re-clone the female set after it was emptied by admins", async () => {
    const col = raw.db(DB_NAME).collection("quiz_questions");
    await col.deleteMany({ gender: "female" });
    expect(await col.countDocuments({ gender: "female" })).toBe(0);

    await simulateColdStart();

    expect(await col.countDocuments({ gender: "female" })).toBe(0);
  });
});
