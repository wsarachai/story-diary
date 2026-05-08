/**
 * Integration test setup — Story Diary
 *
 * Forces MongoDB mode for all integration tests by setting DB_MODE=mongo before
 * any test module (including db.ts) is evaluated. Also overrides MONGODB_DB_NAME
 * to a dedicated test database to isolate integration test data from production.
 *
 * This file must NOT be shared with the regular jest.config.js which uses
 * tests/setup.ts (sets NODE_ENV=test → in-memory mode).
 */

// Force MongoDB mode — overrides the NODE_ENV=test check in db.ts
process.env.DB_MODE = "mongo";

// Use dedicated test database; MONGODB_TEST_DB_NAME can be set in .env
process.env.MONGODB_DB_NAME = process.env.MONGODB_TEST_DB_NAME ?? "story-diary-test";

import { initializeDatabase, closeDatabase, clearUserDataForTesting } from "../../src/db";

export const canRunMongoTests = !!(process.env.MONGODB_URI ?? process.env.MONGODB_USERNAME);

if (!canRunMongoTests) {
  console.warn(
    "\n⚠️  MongoDB integration tests SKIPPED — no MONGODB_URI or MONGODB_USERNAME set.\n" +
      "   Set credentials in backend/.env to run against a real MongoDB instance.\n"
  );
}

/** Wraps it() to skip when MongoDB credentials are unavailable. */
export const mongoIt = canRunMongoTests ? it : it.skip;

beforeAll(async () => {
  if (canRunMongoTests) {
    await initializeDatabase();
  }
}, 30_000);

beforeEach(async () => {
  if (canRunMongoTests) {
    await clearUserDataForTesting();
  }
});

afterAll(async () => {
  if (canRunMongoTests) {
    await closeDatabase();
  }
});
