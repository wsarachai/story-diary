import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePage from "@/app/(authed)/profile/page";
import { Providers } from "@/components/Providers";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";

const replaceMock = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
  }),
  usePathname: () => "/profile",
}));

const MOCK_USER = {
  id: "u1",
  name: "สมชาย ใจดี",
  tel: "0812345678",
  characterName: "สุดหล่อ",
  gender: "male",
  createdAt: new Date().toISOString(),
};

describe("ProfilePage", () => {
  beforeEach(() => {
    // Default to authenticated for these tests
    server.use(
      http.get("/api/auth/me", () => {
        return HttpResponse.json({ user: MOCK_USER });
      })
    );
  });

  it("renders user profile information correctly", async () => {
    render(
      <Providers>
        <ProfilePage />
      </Providers>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("สุดหล่อ")).toBeInTheDocument();
    });

    // name and characterName are now editable inputs
    expect(screen.getByDisplayValue("สมชาย ใจดี")).toBeInTheDocument();
    // phone is read-only text
    expect(screen.getByText("0812345678")).toBeInTheDocument();
    expect(screen.getByText("ข้อมูลส่วนตัว")).toBeInTheDocument();
  });

  it("calls logout and redirects on button click", async () => {
    server.use(
      http.post("/api/auth/logout", () => {
        return HttpResponse.json({});
      })
    );

    render(
      <Providers>
        <ProfilePage />
      </Providers>
    );

    await waitFor(() => screen.getByText("ออกจากระบบ"));
    
    fireEvent.click(screen.getByText("ออกจากระบบ"));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
  });
});
