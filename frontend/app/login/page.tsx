"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGetMeQuery, useLoginMutation } from "@/store/authApi";
import type { ApiErrorCode } from "@/types/error";
import { useClientSearchParams } from "@/lib/hooks";
import layoutStyles from "@/components/BookShellLayout.module.css";
import sharedStyles from "@/components/Shared.module.css";
import styles from "./login.module.css";

function readApiErrorCode(error: unknown): ApiErrorCode | null {
  if (!error || typeof error !== "object" || !("data" in error)) {
    return null;
  }

  const data = error.data;
  if (!data || typeof data !== "object" || !("error" in data)) {
    return null;
  }

  const apiError = data.error;
  if (!apiError || typeof apiError !== "object" || !("code" in apiError)) {
    return null;
  }

  return typeof apiError.code === "string" ? (apiError.code as ApiErrorCode) : null;
}

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
  const searchParams = useClientSearchParams();

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

  const submitError = readApiErrorCode(error) ?? localError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    try {
      await login({ username: username.trim(), password }).unwrap();
      // onQueryStarted stores the token and populates the getMe cache before
      // this continuation runs. The useEffect above will handle the redirect
      // once the Redux user state updates, but we also navigate here as a
      // fast-path for cases where the effect fires after this.
      router.replace(from);
    } catch {
      setPassword("");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={styles.loginForm}
    >
      <h1 className={styles.loginTitle}>
        เข้าสู่ระบบ
      </h1>

      {/* Phone number field */}
      <label
        htmlFor="username"
        className={styles.loginField}
      >
        <span className={styles.loginFieldLabel}>
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
          className={styles.loginInput}
        />
      </label>

      {/* Password field */}
      <label
        htmlFor="password"
        className={styles.loginField}
      >
        <span className={styles.loginFieldLabel}>
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
          className={styles.loginInput}
        />
      </label>

      {/* Submit button — DS-3 states */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`${sharedStyles.roundedPillButton} ${styles.loginSubmit}`}
      >
        {isSubmitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>

      {/* DS-3 error line */}
      {submitError && (
        <p
          id="login-error"
          role="alert"
          aria-live="polite"
          className={styles.loginError}
        >
          {errorCopy(submitError)}
        </p>
      )}

      <p className={styles.loginFooter}>
        ยังไม่เคยลงทะเบียน?{" "}
        <Link href="/register" className={sharedStyles.storyLink}>
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
    <main className={layoutStyles.screen} aria-label="Story Diary Login Layout">
      <section className={layoutStyles.bookShell}>
        {/* Left page — compass art */}
        <section className={`${layoutStyles.page} ${layoutStyles.pageLeft} ${layoutStyles.pageSeamRight}`} aria-hidden="true">
          <div className={styles.compassBg} />
          <div className={styles.compassContainer}>
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: "100%", height: "100%", display: "block" }}>
              <circle cx="100" cy="100" r="63" stroke="currentColor" strokeWidth="5" opacity="0.95" />
              <path d="M100 27L113 82L100 100L87 82L100 27Z" fill="currentColor" />
              <path d="M100 173L87 118L100 100L113 118L100 173Z" fill="currentColor" />
              <path d="M27 100L82 87L100 100L82 113L27 100Z" fill="currentColor" />
              <path d="M173 100L118 113L100 100L118 87L173 100Z" fill="currentColor" />
              <path d="M100 62L109 91L100 100L91 91L100 62Z" fill="#58d8de" />
              <path d="M100 138L91 109L100 100L109 109L100 138Z" fill="#58d8de" />
              <path d="M62 100L91 91L100 100L91 109L62 100Z" fill="#58d8de" />
              <path d="M138 100L109 109L100 100L109 91L138 100Z" fill="#58d8de" />
              <text x="100" y="20" textAnchor="middle" fill="currentColor" fontSize="18" fontFamily="Noto Sans Thai, sans-serif" fontWeight="700">N</text>
              <text x="100" y="193" textAnchor="middle" fill="currentColor" fontSize="18" fontFamily="Noto Sans Thai, sans-serif" fontWeight="700">S</text>
              <text x="15" y="107" textAnchor="middle" fill="currentColor" fontSize="18" fontFamily="Noto Sans Thai, sans-serif" fontWeight="700">W</text>
              <text x="185" y="107" textAnchor="middle" fill="currentColor" fontSize="18" fontFamily="Noto Sans Thai, sans-serif" fontWeight="700">E</text>
            </svg>
          </div>
        </section>

        {/* Right page — login form */}
        <section className={`${layoutStyles.page} ${layoutStyles.pageRight} ${styles.loginFormPage}`}>
          <LoginForm />
        </section>
      </section>
    </main>
  );
}
