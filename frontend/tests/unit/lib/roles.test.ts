// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveRole, isAdmin, isRootAdmin } from "@/lib/roles";

const ROOT_TEL = "0899999999";

let savedRootTel: string | undefined;
let savedAdminIds: string | undefined;

beforeEach(() => {
  savedRootTel = process.env.ROOT_ADMIN_TEL;
  savedAdminIds = process.env.ADMIN_USER_IDS;
});

afterEach(() => {
  if (savedRootTel === undefined) delete process.env.ROOT_ADMIN_TEL;
  else process.env.ROOT_ADMIN_TEL = savedRootTel;
  if (savedAdminIds === undefined) delete process.env.ADMIN_USER_IDS;
  else process.env.ADMIN_USER_IDS = savedAdminIds;
});

describe("resolveRole", () => {
  it("promotes the ROOT_ADMIN_TEL holder to rootAdmin regardless of stored role", () => {
    process.env.ROOT_ADMIN_TEL = ROOT_TEL;
    expect(resolveRole({ tel: ROOT_TEL, role: "user" })).toBe("rootAdmin");
    expect(resolveRole({ tel: ROOT_TEL, role: undefined })).toBe("rootAdmin");
  });

  it("honors a stored rootAdmin / admin role", () => {
    process.env.ROOT_ADMIN_TEL = ROOT_TEL;
    expect(resolveRole({ tel: "0800000000", role: "rootAdmin" })).toBe("rootAdmin");
    expect(resolveRole({ tel: "0800000000", role: "admin" })).toBe("admin");
  });

  it("falls through to the role column when ROOT_ADMIN_TEL is unset", () => {
    delete process.env.ROOT_ADMIN_TEL;
    expect(resolveRole({ tel: ROOT_TEL, role: "user" })).toBe("user");
    expect(resolveRole({ tel: ROOT_TEL, role: "admin" })).toBe("admin");
  });

  it("treats an unmatched user as a regular user even if listed in ADMIN_USER_IDS (dropped mechanism)", () => {
    process.env.ROOT_ADMIN_TEL = ROOT_TEL;
    process.env.ADMIN_USER_IDS = "u-legacy";
    // ADMIN_USER_IDS is no longer honored; only tel + role grant access.
    expect(resolveRole({ tel: "0800000000", role: "user" })).toBe("user");
  });
});

describe("isAdmin / isRootAdmin", () => {
  beforeEach(() => {
    process.env.ROOT_ADMIN_TEL = ROOT_TEL;
  });

  it("isAdmin is true for admin, rootAdmin, and the tel holder", () => {
    expect(isAdmin({ tel: "x", role: "admin" })).toBe(true);
    expect(isAdmin({ tel: "x", role: "rootAdmin" })).toBe(true);
    expect(isAdmin({ tel: ROOT_TEL, role: "user" })).toBe(true);
    expect(isAdmin({ tel: "x", role: "user" })).toBe(false);
  });

  it("isRootAdmin is true only for rootAdmin and the tel holder", () => {
    expect(isRootAdmin({ tel: ROOT_TEL, role: "user" })).toBe(true);
    expect(isRootAdmin({ tel: "x", role: "rootAdmin" })).toBe(true);
    expect(isRootAdmin({ tel: "x", role: "admin" })).toBe(false);
    expect(isRootAdmin({ tel: "x", role: "user" })).toBe(false);
  });
});
