"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetMeQuery, useLoginMutation } from "@/store/authApi";
import type { ApiErrorCode } from "@/types/error";

function errorCopy(code: ApiErrorCode | null): string | null {
  if (!code) return null;
  switch (code) {
    case "INVALID_CREDENTIALS":
      return "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง";
    case "INTERNAL_ERROR":
      return "ระบบขัดข้อง โปรดลองอีกครั้ง";
    default:
      return "เกิดข้อผิดพลาด";
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: user } = useGetMeQuery();
  const [login, { isLoading: isSubmitting, error }] = useLoginMutation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<ApiErrorCode | null>(null);

  const from = searchParams.get("from") ?? "/home";

  // DS-2: redirect if already authenticated
  useEffect(() => {
    if (user) {
      router.replace(from);
    }
  }, [user, router, from]);

  const submitError = (error as any)?.data?.error?.code as ApiErrorCode || localError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    try {
      await login({ username: username.trim(), password }).unwrap();
      router.replace(from);
    } catch (err) {
      setPassword("");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: "540px",
        display: "grid",
        justifyItems: "center",
        gap: "1.4rem",
      }}
    >
      <h1
        style={{
          margin: "0 0 2.25rem",
          fontSize: "56px",
          lineHeight: 1.05,
          fontWeight: 600,
        }}
      >
        เข้าสู่ระบบ
      </h1>

      {/* Phone number field */}
      <label
        htmlFor="username"
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.12fr) minmax(0, 1.28fr)",
          alignItems: "center",
          background: "var(--panel-blue)",
          borderRadius: "999px",
          padding: "0.45rem 0.55rem 0.45rem 1.2rem",
          minHeight: "5rem",
          gap: "0.65rem",
        }}
      >
        <span style={{ fontSize: "30px", fontWeight: 600, whiteSpace: "nowrap" }}>
          เบอร์โทร
        </span>
        <input
          id="username"
          name="username"
          type="tel"
          autoComplete="tel"
          inputMode="numeric"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setLocalError(null);
          }}
          onBlur={(e) => setUsername(e.target.value.trim())}
          required
          aria-describedby={submitError ? "login-error" : undefined}
          style={{
            width: "100%",
            minWidth: 0,
            border: 0,
            borderRadius: "999px",
            background: "var(--field-fill)",
            color: "var(--ink)",
            fontSize: "20px",
            padding: "0.95rem 1.25rem",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      </label>

      {/* Password field */}
      <label
        htmlFor="password"
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.12fr) minmax(0, 1.28fr)",
          alignItems: "center",
          background: "var(--panel-blue)",
          borderRadius: "999px",
          padding: "0.45rem 0.55rem 0.45rem 1.2rem",
          minHeight: "5rem",
          gap: "0.65rem",
        }}
      >
        <span style={{ fontSize: "30px", fontWeight: 600, whiteSpace: "nowrap" }}>
          รหัสผ่าน
        </span>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setLocalError(null);
          }}
          required
          aria-describedby={submitError ? "login-error" : undefined}
          style={{
            width: "100%",
            minWidth: 0,
            border: 0,
            borderRadius: "999px",
            background: "var(--field-fill)",
            color: "var(--ink)",
            fontSize: "20px",
            padding: "0.95rem 1.25rem",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      </label>

      {/* Submit button — DS-3 states */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-pill-button"
        style={{
          marginTop: "1.5rem",
          padding: "0.58em 1.2em",
          fontSize: "40px",
          fontWeight: 600,
          boxShadow: "0 14px 28px -18px rgba(0,0,0,0.45)",
          opacity: isSubmitting ? 0.6 : 1,
          cursor: isSubmitting ? "not-allowed" : "pointer",
        }}
      >
        {isSubmitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>

      {/* DS-3 error line */}
      {submitError && (
        <p
          id="login-error"
          role="alert"
          aria-live="polite"
          style={{
            margin: 0,
            fontSize: "22px",
            textAlign: "center",
            color: "#c0392b",
          }}
        >
          {errorCopy(submitError)}
        </p>
      )}

      <p style={{ margin: "0.3rem 0 0", fontSize: "22px", textAlign: "center" }}>
        ยังไม่เคยลงทะเบียน?{" "}
        <Link href="/register" className="story-link">
          สร้างบัญชี
        </Link>
      </p>
    </form>
  );
}

/**
 * s002 Login Screen — controlled form with DS-3 submit states.
 * DS-2: already-authed redirect to /home (or ?from= target).
 */
export default function LoginPage() {
  return (
    <main className="screen screen-landscape" aria-label="Story Diary Login Layout">
      <section className="book-shell">
        {/* Left page — compass art */}
        <section className="page page-left page-seam-right" aria-hidden="true">
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#59d2d9",
            }}
          />
          <div
            style={{
              position: "absolute",
              pointerEvents: "none",
              left: "4.5%",
              bottom: "3.5%",
              width: "35%",
              aspectRatio: "1",
              color: "rgba(7, 126, 177, 0.95)",
              zIndex: 1,
            }}
          >
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: "100%", height: "100%", display: "block" }}>
              <circle cx="100" cy="100" r="63" stroke="currentColor" strokeWidth="5" opacity="0.95"/>
              <path d="M100 27L113 82L100 100L87 82L100 27Z" fill="currentColor"/>
              <path d="M100 173L87 118L100 100L113 118L100 173Z" fill="currentColor"/>
              <path d="M27 100L82 87L100 100L82 113L27 100Z" fill="currentColor"/>
              <path d="M173 100L118 113L100 100L118 87L173 100Z" fill="currentColor"/>
              <path d="M100 62L109 91L100 100L91 91L100 62Z" fill="#58d8de"/>
              <path d="M100 138L91 109L100 100L109 109L100 138Z" fill="#58d8de"/>
              <path d="M62 100L91 91L100 100L91 109L62 100Z" fill="#58d8de"/>
              <path d="M138 100L109 109L100 100L109 91L138 100Z" fill="#58d8de"/>
              <text x="100" y="20" textAnchor="middle" fill="currentColor" fontSize="18" fontFamily="Noto Sans Thai, sans-serif" fontWeight="700">N</text>
              <text x="100" y="193" textAnchor="middle" fill="currentColor" fontSize="18" fontFamily="Noto Sans Thai, sans-serif" fontWeight="700">S</text>
              <text x="15" y="107" textAnchor="middle" fill="currentColor" fontSize="18" fontFamily="Noto Sans Thai, sans-serif" fontWeight="700">W</text>
              <text x="185" y="107" textAnchor="middle" fill="currentColor" fontSize="18" fontFamily="Noto Sans Thai, sans-serif" fontWeight="700">E</text>
            </svg>
          </div>
        </section>

        {/* Right page — login form */}
        <section
          className="page page-right"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "7% 7% 5%",
          }}
        >
          <Suspense>
            <LoginForm />
          </Suspense>
        </section>
      </section>
    </main>
  );
}
