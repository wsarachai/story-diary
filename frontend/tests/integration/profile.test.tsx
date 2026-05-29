/**
 * ProfilePage integration tests
 *
 * Uses renderWithProviders so every test gets a brand-new store — no manual
 * apiSlice.util.resetApiState() needed and no risk of cache pollution.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePage from "@/app/(authed)/profile/page";
import { renderWithProviders } from "../utils/renderWithProviders";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { MOCK_USER } from "../fixtures";

// ── router mock ───────────────────────────────────────────────────────────────

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
  }),
  usePathname: () => "/profile",
}));

// ── per-test baseline handlers ────────────────────────────────────────────────

beforeEach(() => {
  server.use(
    http.get("/api/auth/me", () => HttpResponse.json({ user: MOCK_USER })),
    http.patch("/api/users/me", async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      return HttpResponse.json({ user: { ...MOCK_USER, ...body } });
    })
  );
});

// ── helper ────────────────────────────────────────────────────────────────────

/** Renders ProfilePage with a fresh isolated store every call. */
function renderProfile() {
  return renderWithProviders(<ProfilePage />);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

describe("ProfilePage – rendering", () => {
  it("shows character name, display name, phone number and page title", async () => {
    renderProfile();

    await waitFor(() => expect(screen.getByText("สุดหล่อ")).toBeInTheDocument());
    expect(screen.getByDisplayValue("สมชาย ใจดี")).toBeInTheDocument();
    expect(screen.getByText("0812345678")).toBeInTheDocument();
    expect(screen.getByText("ข้อมูลส่วนตัว")).toBeInTheDocument();
  });

  it("does not show save/cancel buttons before any edit", async () => {
    renderProfile();
    await waitFor(() => screen.getByDisplayValue("สมชาย ใจดี"));

    expect(screen.queryByRole("button", { name: "บันทึก" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ยกเลิก" })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Inline edit form
// ─────────────────────────────────────────────────────────────────────────────

describe("ProfilePage – inline edit", () => {
  it("shows save/cancel buttons when a field is changed", async () => {
    renderProfile();
    await waitFor(() => screen.getByDisplayValue("สมชาย ใจดี"));

    fireEvent.change(screen.getByDisplayValue("สมชาย ใจดี"), {
      target: { value: "ชื่อใหม่มาก" },
    });

    expect(screen.getByRole("button", { name: "บันทึก" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ยกเลิก" })).toBeInTheDocument();
  });

  it("cancel reverts the field and hides action buttons", async () => {
    renderProfile();
    await waitFor(() => screen.getByDisplayValue("สมชาย ใจดี"));

    fireEvent.change(screen.getByDisplayValue("สมชาย ใจดี"), {
      target: { value: "ชื่อชั่วคราว" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(screen.getByDisplayValue("สมชาย ใจดี")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "บันทึก" })).not.toBeInTheDocument();
  });

  it("save sends PATCH with only the changed fields", async () => {
    let capturedBody: unknown;
    server.use(
      http.patch("/api/users/me", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ user: { ...MOCK_USER, name: "ชื่อใหม่" } });
      })
    );

    renderProfile();
    await waitFor(() => screen.getByDisplayValue("สมชาย ใจดี"));

    fireEvent.change(screen.getByDisplayValue("สมชาย ใจดี"), {
      target: { value: "ชื่อใหม่" },
    });
    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(capturedBody).toEqual({ name: "ชื่อใหม่" }));
  });

  it("shows success feedback after a successful save", async () => {
    renderProfile();
    await waitFor(() => screen.getByDisplayValue("สมชาย ใจดี"));

    fireEvent.change(screen.getByDisplayValue("สมชาย ใจดี"), {
      target: { value: "ชื่อใหม่" },
    });
    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() =>
      expect(screen.getByText(/บันทึกเรียบร้อย/)).toBeInTheDocument()
    );
  });

  it("shows error feedback when the server returns 500", async () => {
    server.use(
      http.patch("/api/users/me", () =>
        HttpResponse.json({ error: "SERVER_ERROR" }, { status: 500 })
      )
    );

    renderProfile();
    await waitFor(() => screen.getByDisplayValue("สมชาย ใจดี"));

    fireEvent.change(screen.getByDisplayValue("สมชาย ใจดี"), {
      target: { value: "ชื่อที่ผิดพลาด" },
    });
    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() =>
      expect(screen.getByText(/เกิดข้อผิดพลาด/)).toBeInTheDocument()
    );
  });

  it("gender toggle changes selection and marks the form dirty", async () => {
    renderProfile();
    await waitFor(() => screen.getByDisplayValue("สมชาย ใจดี"));

    const femaleBtn = screen.getByRole("button", { name: "หญิง" });
    expect(femaleBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(femaleBtn);

    expect(femaleBtn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "บันทึก" })).toBeInTheDocument();
  });

  it("each renderWithProviders call produces a distinct store instance", async () => {
    const { store: store1 } = renderProfile();
    const { store: store2 } = renderProfile();

    // Different object references — mutations to one cannot bleed into the other
    expect(store1).not.toBe(store2);

    // Dispatching to store1 does not affect store2's state reference
    store1.dispatch({ type: "@@noop" });
    expect(store1.getState()).not.toBe(store2.getState());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────────────────────

describe("ProfilePage – logout", () => {
  it("calls logout endpoint and redirects to /login", async () => {
    server.use(
      http.post("/api/auth/logout", () => HttpResponse.json({}))
    );

    renderProfile();
    await waitFor(() => screen.getByText("ออกจากระบบ"));

    fireEvent.click(screen.getByText("ออกจากระบบ"));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
  });
});
