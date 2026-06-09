import { beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * Boots an in-process mongod for the mongo-mode smoke test and points
 * lib/db.ts at it.
 *
 * `MONGODB_URI` is set in `beforeAll` (not at import time) because the port is
 * only known once the server starts. That's fine: `db.ts` reads MONGODB_URI
 * lazily inside `initializeDatabase()` (first query), well after this runs.
 * Setting MONGODB_URI directly short-circuits `buildMongoUri`, so the
 * `mongodb+srv` / `dns.setServers` path is never taken — no Atlas vars needed.
 *
 * `DB_MODE=mongo` itself is injected via vitest config `env` so it is present
 * before `db.ts` is imported (the mode is decided once at module load).
 */
let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
});

afterAll(async () => {
  // Close the Mongo client first, otherwise the open connection keeps vitest
  // alive (the db module holds a singleton MongoClient).
  const { closeDatabase } = await import("@/lib/db");
  await closeDatabase();
  if (mongod) {
    await mongod.stop();
  }
});
