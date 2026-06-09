import type { UserDoc } from "@/lib/db";

export type Role = "user" | "admin" | "rootAdmin";

type RoleInput = Pick<UserDoc, "tel" | "role">;

let warnedMissingRootTel = false;

/**
 * The configured root-admin phone number, or "" if unset.
 *
 * `ROOT_ADMIN_TEL` is the sole bootstrap path to a rootAdmin account: no user
 * is seeded with that role, and the Users page can only grant `admin`. If it
 * is unset, no root admin exists and the user-management page is inaccessible,
 * so warn once (outside tests) to make the misconfiguration visible.
 */
export function rootAdminTel(): string {
  const tel = (process.env.ROOT_ADMIN_TEL ?? "").trim();
  if (!tel && !warnedMissingRootTel && process.env.NODE_ENV !== "test") {
    warnedMissingRootTel = true;
    console.warn(
      "[roles] ROOT_ADMIN_TEL is not set — no root admin will exist and the admin user-management page will be inaccessible."
    );
  }
  return tel;
}

/**
 * Resolve a user's effective role — the single source of truth consumed by the
 * auth guards, the /me profile, and the user-management list. Precedence:
 * the configured root-admin phone number, then the persisted `role` column.
 */
export function resolveRole(user: RoleInput): Role {
  const tel = rootAdminTel();
  if (tel && user.tel === tel) return "rootAdmin";
  if (user.role === "rootAdmin") return "rootAdmin";
  if (user.role === "admin") return "admin";
  return "user";
}

export function isAdmin(user: RoleInput): boolean {
  const role = resolveRole(user);
  return role === "admin" || role === "rootAdmin";
}

export function isRootAdmin(user: RoleInput): boolean {
  return resolveRole(user) === "rootAdmin";
}
