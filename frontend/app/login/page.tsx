"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Phone,
} from "lucide-react";
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

  return typeof apiError.code === "string"
    ? (apiError.code as ApiErrorCode)
    : null;
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
  const [showPassword, setShowPassword] = useState(false);
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
    <form onSubmit={handleSubmit} className={styles.loginForm}>
      <h1 className={styles.loginTitle}>เข้าสู่ระบบ</h1>

      {/* Phone number field */}
      <label htmlFor="username" className={styles.loginField}>
        <span className={styles.loginFieldLabel}>
          <Phone className={styles.fieldIcon} aria-hidden="true" />
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
      <label htmlFor="password" className={styles.loginField}>
        <span className={styles.loginFieldLabel}>
          <KeyRound className={styles.fieldIcon} aria-hidden="true" />
          รหัสผ่าน
        </span>
        <span className={styles.passwordWrap}>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
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
          <button
            type="button"
            className={styles.eyeToggle}
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
          </button>
        </span>
      </label>

      {/* Submit button — DS-3 states */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`${sharedStyles.roundedPillButton} ${styles.loginSubmit}`}
      >
        {isSubmitting && (
          <LoaderCircle className={styles.submitSpinner} aria-hidden="true" />
        )}
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
          <CircleAlert className={styles.errorIcon} aria-hidden="true" />
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
    <main
      className={`${layoutStyles.screen} ${styles.loginScreen}`}
      aria-label="Story Diary Login Layout"
    >
      <section
        className={`${layoutStyles.bookShell} ${layoutStyles.bookShellFitViewport} ${styles.loginBookShell}`}
      >
        {/* Login form only */}
        <section
          className={`${layoutStyles.page} ${layoutStyles.pageMergedOnly} ${styles.loginFormPage}`}
        >
          <LoginForm />
        </section>
      </section>
    </main>
  );
}
