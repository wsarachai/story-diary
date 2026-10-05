/**
 * One-time backfill: re-derive nutrition occurrence status from the recorded
 * meal taps (meal_slots_json).
 *
 * From 2026-07-01 until the fix, saveNutritionCheckin derived status from the
 * meal *text* fields, but checklist taps send meal slots with empty text. Days
 * tapped 3/3 were therefore stored as "pending" (or "partial" when a text field
 * was filled) and never counted in the weekly/monthly totals.
 *
 * Safe to re-run. Only upgrades status, never downgrades:
 *   - 3 meals tapped        → "done"    (completed_at = check-in time)
 *   - 1–2 meals tapped      → "partial" (only if currently "pending")
 *   - "skipped" and check-ins without slot data are left untouched
 *
 * Usage (from frontend/):
 *   node scripts/migrate-nutrition-status-from-slots.mjs           # dry run
 *   node scripts/migrate-nutrition-status-from-slots.mjs --apply   # write
 */

import { MongoClient, ServerApiVersion } from "mongodb";
import dns from "dns";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");
const MEALS = ["breakfast", "lunch", "dinner"];
const RANK = { pending: 0, partial: 1, done: 2 };

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

/** Same resolver override as lib/db.ts (Atlas SRV lookups on some networks). */
function applyDnsOverride() {
  const configured = process.env.MONGODB_DNS_SERVERS?.trim();
  if (configured === "none") return;
  dns.setServers(configured ? configured.split(",").map((s) => s.trim()).filter(Boolean) : ["8.8.8.8", "1.1.1.1"]);
}

function slotStatus(mealSlotsJson) {
  let slots;
  try {
    slots = JSON.parse(mealSlotsJson ?? "[]");
  } catch {
    return null;
  }
  if (!Array.isArray(slots)) return null;
  const count = MEALS.filter((m) => slots.includes(m)).length;
  if (count === 0) return null; // no tap data → nothing to derive
  return count === MEALS.length ? "done" : "partial";
}

async function run() {
  loadEnv();
  applyDnsOverride();

  const uri = buildUri();
  const dbName = process.env.MONGODB_DB_NAME?.trim() || "story-diary";
  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    const checkins = db.collection("nutrition_checkins");
    const occurrences = db.collection("habit_occurrences");

    console.log(`${APPLY ? "APPLY" : "DRY RUN"} on database "${dbName}"`);

    const ops = [];
    const tally = { scanned: 0, toDone: 0, toPartial: 0, unchanged: 0, missingOccurrence: 0 };

    for await (const checkin of checkins.find({}, { projection: { _id: 0, occurrence_id: 1, meal_slots_json: 1, created_at: 1 } })) {
      tally.scanned++;
      const target = slotStatus(checkin.meal_slots_json);
      if (!target) {
        tally.unchanged++;
        continue;
      }
      const occ = await occurrences.findOne({ id: checkin.occurrence_id }, { projection: { _id: 0, id: 1, status: 1, date: 1 } });
      if (!occ) {
        tally.missingOccurrence++;
        continue;
      }
      const current = occ.status;
      if (!(current in RANK) || RANK[target] <= RANK[current]) {
        tally.unchanged++;
        continue;
      }
      if (target === "done") tally.toDone++;
      else tally.toPartial++;
      console.log(`  ${occ.date}  ${occ.id}  ${current} → ${target}`);
      ops.push({
        updateOne: {
          filter: { id: occ.id, status: current },
          update: { $set: { status: target, completed_at: target === "done" ? checkin.created_at ?? new Date().toISOString() : null } },
        },
      });
    }

    console.log("\nSummary:", tally);
    if (!APPLY) {
      console.log(`\nDry run only — ${ops.length} occurrence(s) would change. Re-run with --apply to write.`);
      return;
    }
    if (ops.length === 0) {
      console.log("\nNothing to update.");
      return;
    }
    const result = await occurrences.bulkWrite(ops);
    console.log(`\nUpdated ${result.modifiedCount} occurrence(s).`);
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
