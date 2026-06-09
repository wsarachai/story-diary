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
import { DEFAULT_TIMEZONE } from "@/lib/utils/date";
import type { UserProfile } from "@/types/user";
import type { RegisterRequest } from "@/types/auth";

const SALT_ROUNDS = 12;
const AVATAR_MAX_BYTES = 180 * 1024;
const AVATAR_MAX_WIDTH = 256;
const AVATAR_MAX_HEIGHT = 256;

function readImageDimensions(bytes: Buffer): { width: number; height: number } | null {
    // PNG: width/height are fixed offsets in the IHDR chunk.
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (bytes.length >= 24 && pngSignature.every((v, i) => bytes[i] === v)) {
        const width = bytes.readUInt32BE(16);
        const height = bytes.readUInt32BE(20);
        return { width, height };
    }

    // JPEG: scan markers until SOF frame that contains dimensions.
    if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
        let offset = 2;
        while (offset + 3 < bytes.length) {
            if (bytes[offset] !== 0xff) {
                offset += 1;
                continue;
            }

            const marker = bytes[offset + 1];
            offset += 2;

            if (marker === 0xd8 || marker === 0xd9) continue;
            if (offset + 2 > bytes.length) break;

            const segmentLength = bytes.readUInt16BE(offset);
            if (segmentLength < 2 || offset + segmentLength > bytes.length) break;

            const isSofMarker = (
                marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3 ||
                marker === 0xc5 || marker === 0xc6 || marker === 0xc7 || marker === 0xc9 ||
                marker === 0xca || marker === 0xcb || marker === 0xcd || marker === 0xce || marker === 0xcf
            );

            if (isSofMarker && segmentLength >= 7) {
                const height = bytes.readUInt16BE(offset + 3);
                const width = bytes.readUInt16BE(offset + 5);
                return { width, height };
            }

            offset += segmentLength;
        }
    }

    return null;
}

function validateAvatarDataUrl(avatarUrl: string): void {
    const match = avatarUrl.match(/^data:image\/(?:jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)$/i);
    if (!match) {
        throw Errors.validation("Avatar image format is invalid", [
            { field: "avatarUrl", code: "INVALID_FORMAT", message: "avatarUrl must be a base64 JPEG/PNG data URL" },
        ]);
    }

    const bytes = Buffer.from(match[1], "base64");
    if (!bytes.length) {
        throw Errors.validation("Avatar image format is invalid", [
            { field: "avatarUrl", code: "INVALID_FORMAT", message: "avatarUrl base64 payload is empty" },
        ]);
    }

    if (bytes.length > AVATAR_MAX_BYTES) {
        throw Errors.validation("Avatar image is too large", [
            {
                field: "avatarUrl",
                code: "TOO_LONG",
                message: `avatarUrl must be ${AVATAR_MAX_BYTES} bytes or smaller`,
            },
        ]);
    }

    const dimensions = readImageDimensions(bytes);
    if (!dimensions) {
        throw Errors.validation("Avatar image format is invalid", [
            { field: "avatarUrl", code: "INVALID_FORMAT", message: "unsupported or malformed image data" },
        ]);
    }

    if (dimensions.width > AVATAR_MAX_WIDTH || dimensions.height > AVATAR_MAX_HEIGHT) {
        throw Errors.validation("Avatar image resolution is too large", [
            {
                field: "avatarUrl",
                code: "TOO_LONG",
                message: `avatarUrl must be ${AVATAR_MAX_WIDTH}x${AVATAR_MAX_HEIGHT} or smaller`,
            },
        ]);
    }
}

function resolveRole(row: UserDoc): "user" | "admin" | "rootAdmin" {
    const rootAdminTel = (process.env.ROOT_ADMIN_TEL ?? "").trim();
    if (rootAdminTel && row.tel === rootAdminTel) return "rootAdmin";
    if (row.role === "rootAdmin") return "rootAdmin";
    if (row.role === "admin") return "admin";
    const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    return adminIds.includes(row.id) ? "admin" : "user";
}

function rowToProfile(row: UserDoc): UserProfile {
    return {
        id: row.id,
        name: row.name,
        tel: row.tel,
        characterName: row.character_name,
        gender: row.gender,
        avatarUrl: row.avatar_url ?? null,
        role: resolveRole(row),
        timezone: row.timezone ?? DEFAULT_TIMEZONE,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/** Returns the stored IANA timezone for a user, falling back to DEFAULT_TIMEZONE. */
export async function getUserTimezone(userId: string): Promise<string> {
    const row = await findUserById(userId);
    return row?.timezone ?? DEFAULT_TIMEZONE;
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
        role: "user",
        timezone: input.timezone ?? DEFAULT_TIMEZONE,
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
    if ("avatarUrl" in patch) {
        if (typeof patch.avatarUrl === "string") {
            validateAvatarDataUrl(patch.avatarUrl);
        }
        updates.avatar_url = patch.avatarUrl ?? null;
    }

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
