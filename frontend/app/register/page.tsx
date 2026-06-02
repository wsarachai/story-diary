"use client";

import { useReducer, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGetMeQuery, useRegisterMutation } from "@/store/authApi";
import type { Gender } from "@/types/auth";
import type { ApiErrorCode } from "@/types/error";

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
  errors: Partial<Record<"name" | "tel" | "password" | "confirmPassword" | "characterName" | "gender", string>>;
}

type FormAction =
  | { type: "SET"; field: keyof Omit<FormState, "errors" | "gender">; value: string }
  | { type: "SET_GENDER"; value: Gender }
  | { type: "SET_ERRORS"; errors: FormState["errors"] }
  | { type: "CLEAR_ERROR"; field: keyof FormState["errors"] };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET":
      return { ...state, [action.field]: action.value, errors: { ...state.errors, [action.field]: undefined } };
    case "SET_GENDER":
      return { ...state, gender: action.value, errors: { ...state.errors, gender: undefined } };
    case "SET_ERRORS":
      return { ...state, errors: { ...state.errors, ...action.errors } };
    case "CLEAR_ERROR":
      return { ...state, errors: { ...state.errors, [action.field]: undefined } };
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

  // DS-2: redirect if already authenticated
  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
  }, [user, router]);

  const submitError = (error && "data" in error ? (error.data as { error?: { code?: ApiErrorCode } })?.error?.code : null) as ApiErrorCode;

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
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      errors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
    }
    if (!form.characterName.trim()) errors.characterName = "กรุณากรอกชื่อตัวละคร";
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
    <main className="screen screen-landscape" aria-label="Story Diary Register Layout">
      <form onSubmit={handleSubmit}>
        <section className="book-shell book-shell-tight">
          {/* Left page — account fields */}
          <section
            className="page page-left"
            style={{ padding: "8% 10% 7%" }}
          >
            <h1
              style={{
                margin: "0 0 3.38rem",
                fontSize: "3.5em",
                lineHeight: 1.05,
                fontWeight: 500,
                textAlign: "center",
                fontFamily: "var(--font-baloo2), cursive",
              }}
            >
              ลงทะเบียน
            </h1>

            <div style={{ display: "grid", gap: "1.4rem", marginTop: "3rem" }}>
              {/* Name */}
              <div className="register-line-field">
                <label htmlFor="name" style={{ fontSize: "1.875em", lineHeight: 1, whiteSpace: "nowrap" }}>
                  ชื่อ
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => { dispatchForm({ type: "SET", field: "name", value: e.target.value }); }}
                  aria-describedby={form.errors.name ? "err-name" : undefined}
                  style={{ width: "100%", border: 0, borderBottom: `6px solid ${form.errors.name ? "#c0392b" : "#161616"}`, background: "transparent", fontSize: "1.25em", padding: "0.2rem 0.25rem 0.1rem", outline: "none", fontFamily: "inherit", color: "var(--ink)" }}
                />
              </div>
              {form.errors.name && <span id="err-name" style={{ fontSize: "1em", color: "#c0392b", marginTop: "-0.8rem" }}>{form.errors.name}</span>}

              {/* Phone number (tel) */}
              <div className="register-line-field">
                <label htmlFor="tel" style={{ fontSize: "1.875em", lineHeight: 1, whiteSpace: "nowrap" }}>
                  เบอร์โทร
                </label>
                <input
                  id="tel"
                  name="tel"
                  type="tel"
                  autoComplete="tel"
                  inputMode="numeric"
                  value={form.tel}
                  onChange={(e) => { dispatchForm({ type: "SET", field: "tel", value: e.target.value }); }}
                  aria-describedby={form.errors.tel ? "err-tel" : undefined}
                  style={{ width: "100%", border: 0, borderBottom: `6px solid ${form.errors.tel ? "#c0392b" : "#161616"}`, background: "transparent", fontSize: "1.25em", padding: "0.2rem 0.25rem 0.1rem", outline: "none", fontFamily: "inherit", color: "var(--ink)" }}
                />
              </div>
              {form.errors.tel && <span id="err-tel" style={{ fontSize: "1em", color: "#c0392b", marginTop: "-0.8rem" }}>{form.errors.tel}</span>}

              {/* Password */}
              <div className="register-line-field">
                <label htmlFor="password" style={{ fontSize: "1.875em", lineHeight: 1, whiteSpace: "nowrap" }}>
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => { dispatchForm({ type: "SET", field: "password", value: e.target.value }); }}
                  aria-describedby={form.errors.password ? "err-password" : undefined}
                  style={{ width: "100%", border: 0, borderBottom: `6px solid ${form.errors.password ? "#c0392b" : "#161616"}`, background: "transparent", fontSize: "1.25em", padding: "0.2rem 0.25rem 0.1rem", outline: "none", fontFamily: "inherit", color: "var(--ink)" }}
                />
              </div>
              {form.errors.password && <span id="err-password" style={{ fontSize: "1em", color: "#c0392b", marginTop: "-0.8rem" }}>{form.errors.password}</span>}

              {/* Confirm Password */}
              <div className="register-line-field">
                <label htmlFor="confirm-password" style={{ fontSize: "1.875em", lineHeight: 1, whiteSpace: "nowrap" }}>
                  ยืนยันรหัสผ่าน
                </label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => { dispatchForm({ type: "SET", field: "confirmPassword", value: e.target.value }); }}
                  aria-describedby={form.errors.confirmPassword ? "err-confirm" : undefined}
                  style={{ width: "100%", border: 0, borderBottom: `6px solid ${form.errors.confirmPassword ? "#c0392b" : "#161616"}`, background: "transparent", fontSize: "1.25em", padding: "0.2rem 0.25rem 0.1rem", outline: "none", fontFamily: "inherit", color: "var(--ink)" }}
                />
              </div>
              {form.errors.confirmPassword && <span id="err-confirm" style={{ fontSize: "1em", color: "#c0392b", marginTop: "-0.8rem" }}>{form.errors.confirmPassword}</span>}
            </div>
          </section>

          {/* Right page — character form */}
          <section className="page page-right">
            <div
              style={{
                height: "100%",
                display: "grid",
                justifyItems: "center",
                alignContent: "start",
                gap: "1.4rem",
                padding: "8% 10% 7%",
              }}
            >
              {/* Top-level error (gender or API) */}
              {topError && (
                <p
                  role="alert"
                  aria-live="polite"
                  style={{ margin: 0, fontSize: "1.375em", color: "#c0392b", textAlign: "center" }}
                >
                  {topError}
                </p>
              )}

              {/* Character name */}
              <label
                htmlFor="character-name"
                style={{
                  width: "min(380px, 100%)",
                  border: 0,
                  borderRadius: "999px",
                  background: "var(--panel-blue)",
                  padding: "0.55rem",
                }}
              >
                <input
                  id="character-name"
                  name="characterName"
                  type="text"
                  placeholder="ชื่อตัวละคร"
                  value={form.characterName}
                  onChange={(e) => { dispatchForm({ type: "SET", field: "characterName", value: e.target.value }); }}
                  aria-describedby={form.errors.characterName ? "err-char" : undefined}
                  style={{
                    width: "100%",
                    border: 0,
                    borderRadius: "999px",
                    background: "var(--field-fill)",
                    color: "var(--ink)",
                    fontSize: "1.5em",
                    textAlign: "center",
                    padding: "0.55rem 1rem",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </label>
              {form.errors.characterName && <span id="err-char" style={{ fontSize: "1em", color: "#c0392b" }}>{form.errors.characterName}</span>}

              {/* Gender radio group */}
              <div
                role="radiogroup"
                aria-label="เลือกเพศ"
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1.5rem",
                  alignItems: "end",
                  marginTop: "0.6rem",
                  outline: form.errors.gender ? "3px solid #c0392b" : undefined,
                  borderRadius: form.errors.gender ? "18px" : undefined,
                  padding: form.errors.gender ? "0.5rem" : undefined,
                }}
              >
                {/* Male */}
                <label
                  className="gender-option male"
                  style={{
                    display: "grid",
                    justifyItems: "center",
                    gap: "1rem",
                    textDecoration: "none",
                    color: "#9dc6f2",
                    cursor: "pointer",
                    transition: "filter 0.18s ease, transform 0.18s ease",
                  }}
                >
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={form.gender === "male"}
                    onChange={() => dispatchForm({ type: "SET_GENDER", value: "male" })}
                    style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                  />
                  <MaleFigure selected={form.gender === "male"} className="register-gender-figure" />
                  <span style={{ fontSize: "2em", lineHeight: 1 }}>ชาย</span>
                </label>

                {/* Female */}
                <label
                  className="gender-option female"
                  style={{
                    display: "grid",
                    justifyItems: "center",
                    gap: "1rem",
                    textDecoration: "none",
                    color: "#050505",
                    cursor: "pointer",
                    transition: "filter 0.18s ease, transform 0.18s ease",
                  }}
                >
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={form.gender === "female"}
                    onChange={() => dispatchForm({ type: "SET_GENDER", value: "female" })}
                    style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                  />
                  <FemaleFigure selected={form.gender === "female"} className="register-gender-figure" />
                  <span style={{ fontSize: "2em", lineHeight: 1 }}>หญิง</span>
                </label>
              </div>

              {/* Submit button — DS-4 */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-pill-button"
                style={{
                  padding: "0.45em 1.1em",
                  fontSize: "2.5em",
                  fontWeight: 600,
                  marginTop: "0.3rem",
                  opacity: isSubmitting ? 0.6 : 1,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting ? "กำลังสร้างบัญชี…" : "ยืนยัน"}
              </button>

              <Link
                href="/login"
                style={{
                  fontSize: "1.375em",
                  color: "var(--ink)",
                  opacity: 0.65,
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
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

function MaleFigure({ selected, className }: { selected: boolean; className?: string }) {
  const style: React.CSSProperties = {
    aspectRatio: "0.55 / 1",
    position: "relative",
    color: "#9dc6f2",
    filter: selected ? "drop-shadow(0 0 0.6rem rgba(23,152,190,0.22))" : undefined,
    transform: selected ? "translateY(-2px)" : undefined,
    transition: "filter 0.18s ease, transform 0.18s ease",
  };
  const part: React.CSSProperties = { position: "absolute", display: "block", background: "currentColor" };
  return (
    <span aria-hidden="true" style={style} className={className}>
      <span style={{ ...part, left: "50%", top: 0, width: "26%", aspectRatio: "1", borderRadius: "50%", transform: "translateX(-50%)" }} />
      <span style={{ ...part, left: "50%", top: "18%", width: "36%", height: "44%", borderRadius: "24px", transform: "translateX(-50%)" }} />
      <span style={{ ...part, width: "10%", height: "32%", top: "22%", left: "17%", borderRadius: "999px", transform: "rotate(17deg)", transformOrigin: "top center" }} />
      <span style={{ ...part, width: "10%", height: "32%", top: "22%", right: "17%", borderRadius: "999px", transform: "rotate(-17deg)", transformOrigin: "top center" }} />
      <span style={{ ...part, width: "11%", height: "37%", bottom: 0, left: "39%", borderRadius: "999px" }} />
      <span style={{ ...part, width: "11%", height: "37%", bottom: 0, right: "39%", borderRadius: "999px" }} />
    </span>
  );
}

function FemaleFigure({ selected, className }: { selected: boolean; className?: string }) {
  const style: React.CSSProperties = {
    aspectRatio: "0.55 / 1",
    position: "relative",
    color: "#050505",
    filter: selected ? "drop-shadow(0 0 0.6rem rgba(23,152,190,0.22))" : undefined,
    transform: selected ? "translateY(-2px)" : undefined,
    transition: "filter 0.18s ease, transform 0.18s ease",
  };
  const part: React.CSSProperties = { position: "absolute", display: "block", background: "currentColor" };
  return (
    <span aria-hidden="true" style={style} className={className}>
      {/* Head */}
      <span style={{ ...part, left: "50%", top: 0, width: "26%", aspectRatio: "1", borderRadius: "50%", transform: "translateX(-50%)" }} />
      {/* Torso (dress top) — clip-path triangle scales with figure */}
      <span style={{ ...part, left: "50%", top: "18%", width: "36%", height: "44%", clipPath: "polygon(50% 0, 0% 100%, 100% 100%)", transform: "translateX(-50%)" }} />
      {/* Skirt */}
      <span style={{ ...part, left: "50%", top: "33%", width: "42%", height: "20%", clipPath: "polygon(18% 0, 82% 0, 100% 100%, 0 100%)", transform: "translateX(-50%)" }} />
      {/* Arms */}
      <span style={{ ...part, width: "10%", height: "32%", top: "22%", left: "17%", borderRadius: "999px", transform: "rotate(17deg)", transformOrigin: "top center" }} />
      <span style={{ ...part, width: "10%", height: "32%", top: "22%", right: "17%", borderRadius: "999px", transform: "rotate(-17deg)", transformOrigin: "top center" }} />
      {/* Legs */}
      <span style={{ ...part, width: "11%", height: "31%", bottom: 0, left: "41%", borderRadius: "999px" }} />
      <span style={{ ...part, width: "11%", height: "31%", bottom: 0, right: "41%", borderRadius: "999px" }} />
    </span>
  );
}
