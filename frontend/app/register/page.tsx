"use client";

import { useReducer, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useGetMeQuery, useRegisterMutation } from "@/store/authApi";
import type { Gender } from "@/types/auth";
import type { ApiErrorCode } from "@/types/error";
import layoutStyles from "@/components/BookShellLayout.module.css";
import sharedStyles from "@/components/Shared.module.css";
import styles from "./register.module.css";

// ──────────────────────────────────────────────────────────
// Form state
// ──────────────────────────────────────────────────────────

interface FormState {
  name: string;
  tel: string;
  password: string;
  confirmPassword: string;
  characterName: string;
  gender: Gender | null;
  errors: Partial<
    Record<
      | "name"
      | "tel"
      | "password"
      | "confirmPassword"
      | "characterName"
      | "gender",
      string
    >
  >;
}

type FormAction =
  | {
      type: "SET";
      field: keyof Omit<FormState, "errors" | "gender">;
      value: string;
    }
  | { type: "SET_GENDER"; value: Gender }
  | { type: "SET_ERRORS"; errors: FormState["errors"] }
  | { type: "CLEAR_ERROR"; field: keyof FormState["errors"] };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET":
      return {
        ...state,
        [action.field]: action.value,
        errors: { ...state.errors, [action.field]: undefined },
      };
    case "SET_GENDER":
      return {
        ...state,
        gender: action.value,
        errors: { ...state.errors, gender: undefined },
      };
    case "SET_ERRORS":
      return { ...state, errors: { ...state.errors, ...action.errors } };
    case "CLEAR_ERROR":
      return {
        ...state,
        errors: { ...state.errors, [action.field]: undefined },
      };
    default:
      return state;
  }
}

const initialForm: FormState = {
  name: "",
  tel: "",
  password: "",
  confirmPassword: "",
  characterName: "",
  gender: null,
  errors: {},
};

// ──────────────────────────────────────────────────────────
// Error copy
// ──────────────────────────────────────────────────────────

function apiErrorCopy(code: ApiErrorCode | null): string | null {
  if (!code) return null;
  switch (code) {
    case "PHONE_TAKEN":
      return "เบอร์โทรนี้ถูกใช้งานแล้ว";
    case "INTERNAL_ERROR":
      return "ระบบขัดข้อง โปรดลองอีกครั้ง";
    default:
      return "เกิดข้อผิดพลาด";
  }
}

/**
 * s003 Register Screen — 2-page form with DS-4 submit states.
 * DS-2: already-authed redirect to /home.
 */
export default function RegisterPage() {
  const router = useRouter();

  const { data: user } = useGetMeQuery();
  const [register, { isLoading: isSubmitting, error }] = useRegisterMutation();

  const [form, dispatchForm] = useReducer(formReducer, initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // DS-2: redirect if already authenticated
  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
  }, [user, router]);

  const submitError = (
    error && "data" in error
      ? (error.data as { error?: { code?: ApiErrorCode } })?.error?.code
      : null
  ) as ApiErrorCode;

  function validate(): boolean {
    const errors: FormState["errors"] = {};
    if (!form.name.trim()) errors.name = "กรุณากรอกชื่อ";
    if (!form.tel.trim()) {
      errors.tel = "กรุณากรอกเบอร์โทร";
    } else if (!/^0[0-9]{9}$/.test(form.tel.trim())) {
      errors.tel = "เบอร์โทรไม่ถูกต้อง (ต้องเป็นตัวเลข 10 หลัก เริ่มต้นด้วย 0)";
    }
    if (!form.password) errors.password = "กรุณากรอกรหัสผ่าน";
    if (!form.confirmPassword) errors.confirmPassword = "กรุณายืนยันรหัสผ่าน";
    if (
      form.password &&
      form.confirmPassword &&
      form.password !== form.confirmPassword
    ) {
      errors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
    }
    if (!form.characterName.trim())
      errors.characterName = "กรุณากรอกชื่อตัวละคร";
    if (!form.gender) errors.gender = "เลือกเพศ";
    dispatchForm({ type: "SET_ERRORS", errors });
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await register({
        name: form.name.trim(),
        tel: form.tel.trim(),
        password: form.password,
        characterName: form.characterName.trim(),
        gender: form.gender!,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }).unwrap();
      router.replace("/home");
    } catch {
      // ignore
    }
  }

  const topError = submitError
    ? apiErrorCopy(submitError)
    : form.errors.gender
      ? form.errors.gender
      : null;

  return (
    <main
      className={layoutStyles.screen}
      aria-label="Story Diary Register Layout"
    >
      <form onSubmit={handleSubmit}>
        <section
          className={`${layoutStyles.bookShell} ${layoutStyles.bookShellTight}`}
        >
          {/* Left page — account fields */}
          <section
            className={`${layoutStyles.page} ${layoutStyles.pageLeft} ${styles.registerLeftPage}`}
          >
            <h1 className={styles.registerTitle}>ลงทะเบียน</h1>

            <div className={styles.registerFormGrid}>
              {/* Name */}
              <div className={styles.registerLineField}>
                <label htmlFor="name" className={styles.registerLabel}>
                  ชื่อ
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => {
                    dispatchForm({
                      type: "SET",
                      field: "name",
                      value: e.target.value,
                    });
                  }}
                  aria-describedby={form.errors.name ? "err-name" : undefined}
                  className={`${styles.registerInput} ${form.errors.name ? styles.registerInputError : ""}`}
                />
              </div>
              {form.errors.name && (
                <span id="err-name" className={styles.fieldError}>
                  <CircleAlert
                    className={styles.errorIcon}
                    aria-hidden="true"
                  />
                  {form.errors.name}
                </span>
              )}

              {/* Phone number (tel) */}
              <div className={styles.registerLineField}>
                <label htmlFor="tel" className={styles.registerLabel}>
                  เบอร์โทร
                </label>
                <input
                  id="tel"
                  name="tel"
                  type="tel"
                  autoComplete="tel"
                  inputMode="numeric"
                  value={form.tel}
                  onChange={(e) => {
                    dispatchForm({
                      type: "SET",
                      field: "tel",
                      value: e.target.value,
                    });
                  }}
                  aria-describedby={form.errors.tel ? "err-tel" : undefined}
                  className={`${styles.registerInput} ${form.errors.tel ? styles.registerInputError : ""}`}
                />
              </div>
              {form.errors.tel && (
                <span id="err-tel" className={styles.fieldError}>
                  <CircleAlert
                    className={styles.errorIcon}
                    aria-hidden="true"
                  />
                  {form.errors.tel}
                </span>
              )}

              {/* Password */}
              <div className={styles.registerLineField}>
                <label htmlFor="password" className={styles.registerLabel}>
                  Password
                </label>
                <span className={styles.passwordWrap}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => {
                      dispatchForm({
                        type: "SET",
                        field: "password",
                        value: e.target.value,
                      });
                    }}
                    aria-describedby={
                      form.errors.password ? "err-password" : undefined
                    }
                    className={`${styles.registerInput} ${form.errors.password ? styles.registerInputError : ""}`}
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
              </div>
              {form.errors.password && (
                <span id="err-password" className={styles.fieldError}>
                  <CircleAlert
                    className={styles.errorIcon}
                    aria-hidden="true"
                  />
                  {form.errors.password}
                </span>
              )}

              {/* Confirm Password */}
              <div className={styles.registerLineField}>
                <label
                  htmlFor="confirm-password"
                  className={styles.registerLabel}
                >
                  ยืนยันรหัสผ่าน
                </label>
                <span className={styles.passwordWrap}>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(e) => {
                      dispatchForm({
                        type: "SET",
                        field: "confirmPassword",
                        value: e.target.value,
                      });
                    }}
                    aria-describedby={
                      form.errors.confirmPassword ? "err-confirm" : undefined
                    }
                    className={`${styles.registerInput} ${form.errors.confirmPassword ? styles.registerInputError : ""}`}
                  />
                  <button
                    type="button"
                    className={styles.eyeToggle}
                    aria-label={showConfirm ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    aria-pressed={showConfirm}
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? (
                      <EyeOff aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                  </button>
                </span>
              </div>
              {form.errors.confirmPassword && (
                <span id="err-confirm" className={styles.fieldError}>
                  <CircleAlert
                    className={styles.errorIcon}
                    aria-hidden="true"
                  />
                  {form.errors.confirmPassword}
                </span>
              )}
            </div>
          </section>

          {/* Right page — character form */}
          <section className={`${layoutStyles.page} ${layoutStyles.pageRight}`}>
            <div className={styles.characterForm}>
              {/* Top-level error (gender or API) */}
              {topError && (
                <p role="alert" aria-live="polite" className={styles.topError}>
                  <CircleAlert
                    className={styles.errorIcon}
                    aria-hidden="true"
                  />
                  {topError}
                </p>
              )}

              {/* Character name */}
              <label htmlFor="character-name" className={styles.charNameLabel}>
                <input
                  id="character-name"
                  name="characterName"
                  type="text"
                  placeholder="ชื่อตัวละคร"
                  value={form.characterName}
                  onChange={(e) => {
                    dispatchForm({
                      type: "SET",
                      field: "characterName",
                      value: e.target.value,
                    });
                  }}
                  aria-describedby={
                    form.errors.characterName ? "err-char" : undefined
                  }
                  className={styles.charNameInput}
                />
              </label>
              {form.errors.characterName && (
                <span
                  id="err-char"
                  className={styles.fieldError}
                  style={{ marginTop: 0 }}
                >
                  <CircleAlert
                    className={styles.errorIcon}
                    aria-hidden="true"
                  />
                  {form.errors.characterName}
                </span>
              )}

              {/* Gender radio group */}
              <div
                role="radiogroup"
                aria-label="เลือกเพศ"
                className={`${styles.genderGroup} ${form.errors.gender ? styles.genderGroupError : ""}`}
              >
                {/* Male */}
                <label
                  className={`${styles.genderOption} ${form.gender === "male" ? styles.genderOptionSelected : styles.genderOptionUnselected}`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={form.gender === "male"}
                    onChange={() =>
                      dispatchForm({ type: "SET_GENDER", value: "male" })
                    }
                    style={{
                      position: "absolute",
                      opacity: 0,
                      pointerEvents: "none",
                    }}
                  />
                  <MaleFigure
                    selected={form.gender === "male"}
                    className={styles.registerGenderFigure}
                  />
                  <span className={styles.genderOptionLabel}>ชาย</span>
                </label>

                {/* Female */}
                <label
                  className={`${styles.genderOption} ${form.gender === "female" ? styles.genderOptionSelected : styles.genderOptionUnselected}`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={form.gender === "female"}
                    onChange={() =>
                      dispatchForm({ type: "SET_GENDER", value: "female" })
                    }
                    style={{
                      position: "absolute",
                      opacity: 0,
                      pointerEvents: "none",
                    }}
                  />
                  <FemaleFigure
                    selected={form.gender === "female"}
                    className={styles.registerGenderFigure}
                  />
                  <span className={styles.genderOptionLabel}>หญิง</span>
                </label>
              </div>

              {/* Submit button — DS-4 */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`${sharedStyles.roundedPillButton} ${styles.registerSubmit}`}
              >
                {isSubmitting && (
                  <LoaderCircle
                    className={styles.submitSpinner}
                    aria-hidden="true"
                  />
                )}
                {isSubmitting ? "กำลังสร้างบัญชี…" : "ยืนยัน"}
              </button>

              <Link href="/login" className={styles.loginLink}>
                มีบัญชีแล้ว? เข้าสู่ระบบ
              </Link>
            </div>
          </section>
        </section>
      </form>
    </main>
  );
}

// ──────────────────────────────────────────────────────────
// Figure sub-components
// ──────────────────────────────────────────────────────────

function MaleFigure({
  selected,
  className,
}: {
  selected: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`${styles.figureWrap} ${selected ? styles.figureWrapSelected : ""} ${className}`}
    >
      <span
        className={styles.figurePart}
        style={{
          left: "50%",
          top: 0,
          width: "26%",
          aspectRatio: "1",
          borderRadius: "50%",
          transform: "translateX(-50%)",
        }}
      />
      <span
        className={styles.figurePart}
        style={{
          left: "50%",
          top: "18%",
          width: "36%",
          height: "44%",
          borderRadius: "24px",
          transform: "translateX(-50%)",
        }}
      />
      <span
        className={styles.figurePart}
        style={{
          width: "10%",
          height: "32%",
          top: "22%",
          left: "17%",
          borderRadius: "999px",
          transform: "rotate(17deg)",
          transformOrigin: "top center",
        }}
      />
      <span
        className={styles.figurePart}
        style={{
          width: "10%",
          height: "32%",
          top: "22%",
          right: "17%",
          borderRadius: "999px",
          transform: "rotate(-17deg)",
          transformOrigin: "top center",
        }}
      />
      <span
        className={styles.figurePart}
        style={{
          width: "11%",
          height: "37%",
          bottom: 0,
          left: "39%",
          borderRadius: "999px",
        }}
      />
      <span
        className={styles.figurePart}
        style={{
          width: "11%",
          height: "37%",
          bottom: 0,
          right: "39%",
          borderRadius: "999px",
        }}
      />
    </span>
  );
}

function FemaleFigure({
  selected,
  className,
}: {
  selected: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`${styles.figureWrap} ${selected ? styles.figureWrapSelected : ""} ${className}`}
    >
      {/* Head */}
      <span
        className={styles.figurePart}
        style={{
          left: "50%",
          top: 0,
          width: "26%",
          aspectRatio: "1",
          borderRadius: "50%",
          transform: "translateX(-50%)",
        }}
      />
      {/* Torso (dress top) — clip-path triangle scales with figure */}
      <span
        className={styles.figurePart}
        style={{
          left: "50%",
          top: "18%",
          width: "36%",
          height: "44%",
          clipPath: "polygon(50% 0, 0% 100%, 100% 100%)",
          transform: "translateX(-50%)",
        }}
      />
      {/* Skirt */}
      <span
        className={styles.figurePart}
        style={{
          left: "50%",
          top: "33%",
          width: "42%",
          height: "20%",
          clipPath: "polygon(18% 0, 82% 0, 100% 100%, 0 100%)",
          transform: "translateX(-50%)",
        }}
      />
      {/* Arms */}
      <span
        className={styles.figurePart}
        style={{
          width: "10%",
          height: "32%",
          top: "22%",
          left: "17%",
          borderRadius: "999px",
          transform: "rotate(17deg)",
          transformOrigin: "top center",
        }}
      />
      <span
        className={styles.figurePart}
        style={{
          width: "10%",
          height: "32%",
          top: "22%",
          right: "17%",
          borderRadius: "999px",
          transform: "rotate(-17deg)",
          transformOrigin: "top center",
        }}
      />
      {/* Legs */}
      <span
        className={styles.figurePart}
        style={{
          width: "11%",
          height: "31%",
          bottom: 0,
          left: "41%",
          borderRadius: "999px",
        }}
      />
      <span
        className={styles.figurePart}
        style={{
          width: "11%",
          height: "31%",
          bottom: 0,
          right: "41%",
          borderRadius: "999px",
        }}
      />
    </span>
  );
}
