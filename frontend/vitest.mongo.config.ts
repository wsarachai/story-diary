import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Mongo-mode smoke test config — exercises the `mongo` branch of lib/db.ts
 * against a real mongod (mongodb-memory-server), which the default suite never
 * touches (it runs the `memory` branch).
 *
 * Differences from the default `vitest.config.ts`:
 *  - `environment: node` — no DOM/localStorage needed, these tests call route
 *    handlers directly.
 *  - It does NOT load `tests/setup.ts` (which starts MSW); these tests hit the
 *    handlers in-process, so no fetch interception is wanted.
 *  - `DB_MODE=mongo` is injected via `env` so it is set BEFORE lib/db.ts is
 *    imported — `db.ts` reads the mode once at module load. MONGODB_URI (dynamic
 *    port) is set later by the setup file's beforeAll.
 *  - `fileParallelism: false` — a single shared mongod, one worker.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/mongo/**/*.test.ts"],
    setupFiles: ["./tests/mongo/setup.ts"],
    env: {
      DB_MODE: "mongo",
      JWT_SECRET: "mongo-smoke-secret",
      // Keep the root-admin phone distinct from any test user so registration
      // never accidentally mints a rootAdmin.
      ROOT_ADMIN_TEL: "0000000000",
    },
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
    testTimeout: 30_000,
    // First run may download the mongod binary; give the boot room.
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
