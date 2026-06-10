/**
 * One-time migration: set `nutrition_preset` for existing nutrition activities
 * whose names exactly match known preset labels.
 *
 * Safe to re-run — only updates docs where:
 *   - category is "nutrition"
 *   - nutrition_preset is missing/null
 *   - name exactly equals one of the canonical preset labels
 *
 * Usage (from frontend/):
 *   node scripts/migrate-add-nutrition-preset.mjs
 */

import { MongoClient, ServerApiVersion } from "mongodb";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PRESET_MAP = {
  nutrition_5_groups: "รับประทานอาหารครบ 5 หมู่",
  nutrition_clean_cooked: "รับประทานอาหารปรุงสุก สะอาด",
  nutrition_mild_taste: "รับประทานอาหารรสไม่จัด",
  nutrition_order_low_seasoning: "ซื้ออาหารตามสั่งจากร้าน บอกแม่ค้าปรุงรสอ่อน",
};

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
    const activities = db.collection("habit_activities");

    let modifiedTotal = 0;

    for (const [presetKey, presetLabel] of Object.entries(PRESET_MAP)) {
      const result = await activities.updateMany(
        {
          category: "nutrition",
          name: presetLabel,
          $or: [
            { nutrition_preset: { $exists: false } },
            { nutrition_preset: null },
          ],
        },
        {
          $set: {
            nutrition_preset: presetKey,
            updated_at: new Date().toISOString(),
          },
        }
      );

      modifiedTotal += result.modifiedCount;
      if (result.modifiedCount > 0) {
        console.log(`Mapped ${result.modifiedCount} document(s) to ${presetKey}.`);
      }
    }

    console.log(`Migration complete. Updated ${modifiedTotal} nutrition activity document(s).`);
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
