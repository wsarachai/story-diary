/**
 * One-time migration: add `timezone` field to all existing user documents
 * that are missing it. Safe to re-run — skips users who already have it.
 *
 * Usage (from frontend/):
 *   node scripts/migrate-add-timezone.mjs
 */

import { MongoClient, ServerApiVersion } from "mongodb";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ──────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  try {
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (key && val && !process.env[key]) {
        process.env[key] = val;
      }
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

const DEFAULT_TIMEZONE = "Asia/Bangkok";

async function run() {
  loadEnv();

  const uri = buildUri();
  const dbName = process.env.MONGODB_DB_NAME?.trim() || "story-diary";

  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection("users");

    // Count how many need the field
    const missing = await users.countDocuments({ timezone: { $exists: false } });
    console.log(`Found ${missing} user(s) without a timezone field.`);

    if (missing === 0) {
      console.log("Nothing to migrate. Exiting.");
      return;
    }

    const result = await users.updateMany(
      { timezone: { $exists: false } },
      { $set: { timezone: DEFAULT_TIMEZONE } }
    );

    console.log(`Migration complete. Updated ${result.modifiedCount} user document(s) → timezone="${DEFAULT_TIMEZONE}".`);
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
