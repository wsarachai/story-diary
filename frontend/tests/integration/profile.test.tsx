import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import ProfilePage from "@/app/(authed)/profile/page";
import { Providers } from "@/components/Providers";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { store } from "@/store/index";
import { apiSlice } from "@/store/apiSlice";
import { MOCK_USER } from "../fixtures";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
  }),
  usePathname: () => "/profile",
}));

function renderProfile() {
  return render(
    <Providers>
      <ProfilePage />
    </Providers>
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    // Reset the shared RTK Query cache so each test fetches fresh user data
    store.dispatch(apiSlice.util.resetApiState());
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json({ user: MOCK_USER })),
      http.patch("/api/users/me", async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ user: { ...MOCK_USER, ...body } });
      })
    );
  });

  afterEach(() => {
    cleanup();
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it("renders user profile information correctly", async () => {
    renderProfile();

    await waitFor(() => {
      expect(screen.getByText("สุดหล่อ")).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("สมชาย ใจดี")).toBeInTheDocument();
    expect(screen.getByText("0812345678")).toBeInTheDocument();
    expect(screen.getByText("ข้อมูลส่วนตัว")).toBeInTheDocument();
  });

  it("does not show save/cancel buttons initially", async () => {
    renderProfile();
    await waitFor(() => screen.getByDisplayValue("สมชาย ใจดี"));

    expect(screen.queryByRole("button", { name: "บันทึก" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ยกเลิก" })).not.toBeInTheDocument();
  });

  // ── Inline edit form ───────────────────────────────────────────────────────

  it("shows save/cancel buttons when a field is edited", async () => {
    renderProfile();
    await waitFor(() => screen.getByDisplayValue("สมชาย ใจดี"));

    fireEvent.change(screen.getByDisplayValue("สมชาย ใจดี"), {
      target: { value: "ชื่อใหม่มาก" },
    });

    expect(screen.getByRole("button", { name: "บันทึก" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ยกเลิก" })).toBeInTheDocument();
  });

  it("cancel reverts form to original values and hides action buttons", async () => {
    renderProfile();
    await waitFor(() => screen.getByDisplayValue("สมชาย ใจดี"));

    fireEvent.change(screen.getByDisplayValue("สมชาย ใจดี"), {
      target: { value: "ชื่อชั่วคราว" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(screen.getByDisplayValue("สมชาย ใจดี")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "บันทึก" })).not.toBeInTheDocument();
  });

  it("save calls PATCH with only the changed fields", async () => {
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

    await waitFor(() => {
      expect(capturedBody).toEqual({ name: "ชื่อใหม่" });
    });
  });

  it("shows success feedback after a successful save", async () => {
    renderProfile();
    await waitFor(() => screen.getByDisplayValue("สมชาย ใจดี"));

    fireEvent.change(screen.getByDisplayValue("สมชาย ใจดี"), {
      target: { value: "ชื่อใหม่" },
    });
    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => {
      expect(screen.getByText(/บันทึกเรียบร้อย/)).toBeInTheDocument();
    });
  });

  it("shows error feedback when save fails", async () => {
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

    await waitFor(() => {
      expect(screen.getByText(/เกิดข้อผิดพลาด/)).toBeInTheDocument();
    });
  });

  it("gender toggle changes selection and marks form dirty", async () => {
    renderProfile();
    await waitFor(() => screen.getByDisplayValue("สมชาย ใจดี"));

    const femaleBtn = screen.getByRole("button", { name: "หญิง" });
    expect(femaleBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(femaleBtn);

    expect(femaleBtn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "บันทึก" })).toBeInTheDocument();
  });

  // ── Logout ─────────────────────────────────────────────────────────────────

  it("calls logout and redirects on button click", async () => {
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
