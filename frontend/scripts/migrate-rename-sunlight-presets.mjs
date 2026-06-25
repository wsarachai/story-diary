/**
 * One-time migration: rename physical_preset keys for the two sunlight presets
 * renamed in June 2026:
 *   morning_sunlight → sun_protection_clothing
 *   daytime_sunlight → sunscreen
 *
 * The third sunlight-menu option previously used the shared "other" key and
 * cannot be distinguished from other-category activities — it is not migrated.
 *
 * Safe to re-run — only updates docs where physical_preset matches the old key.
 *
 * Usage (from frontend/):
 *   node scripts/migrate-rename-sunlight-presets.mjs
 */

import { MongoClient, ServerApiVersion } from "mongodb";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const RENAMES = [
  { from: "morning_sunlight", to: "sun_protection_clothing" },
  { from: "daytime_sunlight", to: "sunscreen" },
];

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

async function run() {
  loadEnv();
  const uri = buildUri();
  const dbName = process.env.MONGODB_DB_NAME?.trim() || "story-diary";
  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  });

  try {
    await client.connect();
    const activities = client.db(dbName).collection("habit_activities");
    let total = 0;
    for (const { from, to } of RENAMES) {
      const result = await activities.updateMany(
        { physical_preset: from },
        { $set: { physical_preset: to, updated_at: new Date().toISOString() } },
      );
      total += result.modifiedCount;
      if (result.modifiedCount > 0) {
        console.log(`Renamed ${result.modifiedCount} doc(s): ${from} → ${to}`);
      }
    }
    console.log(`Migration complete. Updated ${total} activity document(s).`);
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
