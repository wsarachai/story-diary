/**
 * Auth service — handles register, login, and session-user lookup.
 * All password handling is done here; hashes never leave this module.
 */
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import db from "../db";
import { Errors } from "../lib/errors";
import type { UserProfile } from "../../../src/types/user";
import type { RegisterRequest } from "../../../src/types/auth";

const SALT_ROUNDS = 12;

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  character_name: string;
  gender: string;
  created_at: string;
  updated_at: string;
}

function rowToProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    characterName: row.character_name,
    gender: row.gender as UserProfile["gender"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function registerUser(input: RegisterRequest): Promise<UserProfile> {
  // Check email uniqueness
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(input.email.toLowerCase().trim()) as { id: string } | undefined;

  if (existing) {
    throw Errors.conflict("EMAIL_TAKEN", "Email address is already registered");
  }

  const hash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const now = new Date().toISOString();
  const id = uuidv4();

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, character_name, gender, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, input.name.trim(), input.email.toLowerCase().trim(), hash, input.characterName.trim(), input.gender, now, now);

  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;
  return rowToProfile(row);
}

export async function loginUser(username: string, password: string): Promise<UserProfile> {
  const normalised = username.trim().toLowerCase();

  // Accept either email or display name
  const row = db
    .prepare("SELECT * FROM users WHERE email = ? OR LOWER(name) = ?")
    .get(normalised, normalised) as UserRow | undefined;

  if (!row) {
    throw Errors.invalidCredentials();
  }

  const match = await bcrypt.compare(password, row.password_hash);
  if (!match) {
    throw Errors.invalidCredentials();
  }

  return rowToProfile(row);
}

export function getUserById(id: string): UserProfile {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  if (!row) {
    throw Errors.notFound("USER_NOT_FOUND", "User not found");
  }
  return rowToProfile(row);
}

export async function updateUser(
  id: string,
  patch: Partial<{ name: string; email: string; characterName: string; gender: string }>
): Promise<UserProfile> {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  if (!row) {
    throw Errors.notFound("USER_NOT_FOUND", "User not found");
  }

  if (patch.email) {
    const conflict = db
      .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
      .get(patch.email.toLowerCase().trim(), id) as { id: string } | undefined;
    if (conflict) {
      throw Errors.conflict("EMAIL_TAKEN", "Email address is already registered");
    }
  }

  const now = new Date().toISOString();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (patch.name !== undefined) { updates.push("name = ?"); values.push(patch.name.trim()); }
  if (patch.email !== undefined) { updates.push("email = ?"); values.push(patch.email.toLowerCase().trim()); }
  if (patch.characterName !== undefined) { updates.push("character_name = ?"); values.push(patch.characterName.trim()); }
  if (patch.gender !== undefined) { updates.push("gender = ?"); values.push(patch.gender); }

  if (updates.length === 0) {
    throw Errors.validation("Request body must include at least one updatable field");
  }

  updates.push("updated_at = ?");
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;
  return rowToProfile(updated);
}
