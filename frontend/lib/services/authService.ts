import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import {
    findUserById,
    findUserByTel,
    findUserByTelExcludingId,
    insertUser,
    updateUserDoc,
    type UserDoc,
} from "@/lib/db";
import { Errors } from "@/lib/errors";
import type { UserProfile } from "@/types/user";
import type { RegisterRequest } from "@/types/auth";

const SALT_ROUNDS = 12;

function rowToProfile(row: UserDoc): UserProfile {
    return {
        id: row.id,
        name: row.name,
        tel: row.tel,
        characterName: row.character_name,
        gender: row.gender,
        avatarUrl: row.avatar_url ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function signToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET ?? "story-diary-dev-secret", { expiresIn: "7d" });
}

export async function registerUser(input: RegisterRequest): Promise<UserProfile> {
    const tel = input.tel.trim();
    const existing = await findUserByTel(tel);

    if (existing) {
        throw Errors.conflict("PHONE_TAKEN", "Phone number is already registered");
    }

    const hash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const now = new Date().toISOString();
    const user: UserDoc = {
        id: uuidv4(),
        name: input.name.trim(),
        tel,
        password_hash: hash,
        character_name: input.characterName.trim(),
        gender: input.gender,
        created_at: now,
        updated_at: now,
    };

    await insertUser(user);
    return rowToProfile(user);
}

export async function loginUser(username: string, password: string): Promise<UserProfile> {
    const tel = username.trim();
    const row = await findUserByTel(tel);

    if (!row) {
        throw Errors.invalidCredentials();
    }

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
        throw Errors.invalidCredentials();
    }

    return rowToProfile(row);
}

export async function getUserById(id: string): Promise<UserProfile> {
    const row = await findUserById(id);
    if (!row) {
        throw Errors.notFound("USER_NOT_FOUND", "User not found");
    }
    return rowToProfile(row);
}

export async function updateUser(
    id: string,
    patch: Partial<{ name: string; tel: string; characterName: string; gender: string; avatarUrl: string | null }>
): Promise<UserProfile> {
    const row = await findUserById(id);
    if (!row) {
        throw Errors.notFound("USER_NOT_FOUND", "User not found");
    }

    if (patch.tel) {
        const conflict = await findUserByTelExcludingId(patch.tel.trim(), id);
        if (conflict) {
            throw Errors.conflict("PHONE_TAKEN", "Phone number is already registered");
        }
    }

    const updates: Partial<UserDoc> = {};

    if (patch.name !== undefined) updates.name = patch.name.trim();
    if (patch.tel !== undefined) updates.tel = patch.tel.trim();
    if (patch.characterName !== undefined) updates.character_name = patch.characterName.trim();
    if (patch.gender !== undefined) updates.gender = patch.gender as UserDoc["gender"];
    if ("avatarUrl" in patch) updates.avatar_url = patch.avatarUrl ?? null;

    if (Object.keys(updates).length === 0) {
        throw Errors.validation("Request body must include at least one updatable field");
    }

    updates.updated_at = new Date().toISOString();

    const updated = await updateUserDoc(id, updates);
    if (!updated) {
        throw Errors.notFound("USER_NOT_FOUND", "User not found");
    }

    return rowToProfile(updated);
}
