"use client";

import { useReducer, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  register,
  clearSubmitError,
  selectAuthStatus,
  selectIsAuthed,
  selectSubmitError,
} from "@/store/authSlice";
import type { Gender } from "@/types/auth";
import type { ApiErrorCode } from "@/types/error";

// ──────────────────────────────────────────────────────────
// Form state
// ──────────────────────────────────────────────────────────

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  characterName: string;
  gender: Gender | null;
  errors: Partial<Record<"name" | "email" | "password" | "confirmPassword" | "characterName" | "gender", string>>;
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
  email: "",
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
    case "EMAIL_TAKEN":
      return "อีเมลนี้ถูกใช้งานแล้ว";
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
  const dispatch = useAppDispatch();

  const status = useAppSelector(selectAuthStatus);
  const isAuthed = useAppSelector(selectIsAuthed);
  const submitError = useAppSelector(selectSubmitError);

  const [form, dispatchForm] = useReducer(formReducer, initialForm);

  // DS-2: redirect if already authenticated
  useEffect(() => {
    if (isAuthed) {
      router.replace("/home");
    }
  }, [isAuthed, router]);

  const isSubmitting = status === "authenticating";

  function validate(): boolean {
    const errors: FormState["errors"] = {};
    if (!form.name.trim()) errors.name = "กรุณากรอกชื่อ";
    if (!form.email.trim()) errors.email = "กรุณากรอกอีเมล";
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
    dispatch(clearSubmitError());
    const result = await dispatch(
      register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        characterName: form.characterName.trim(),
        gender: form.gender!,
      })
    );
    if (register.fulfilled.match(result)) {
      router.replace("/home");
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
                fontSize: "56px",
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
              <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", alignItems: "end", columnGap: "0.6rem" }}>
                <label htmlFor="name" style={{ fontSize: "30px", lineHeight: 1, whiteSpace: "nowrap" }}>
                  ชื่อ
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => { dispatchForm({ type: "SET", field: "name", value: e.target.value }); dispatch(clearSubmitError()); }}
                  aria-describedby={form.errors.name ? "err-name" : undefined}
                  style={{ width: "100%", border: 0, borderBottom: `6px solid ${form.errors.name ? "#c0392b" : "#161616"}`, background: "transparent", fontSize: "20px", padding: "0.2rem 0.25rem 0.1rem", outline: "none", fontFamily: "inherit", color: "var(--ink)" }}
                />
              </div>
              {form.errors.name && <span id="err-name" style={{ fontSize: "16px", color: "#c0392b", marginTop: "-0.8rem" }}>{form.errors.name}</span>}

              {/* Email */}
              <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", alignItems: "end", columnGap: "0.6rem" }}>
                <label htmlFor="email" style={{ fontSize: "30px", lineHeight: 1, whiteSpace: "nowrap" }}>
                  e-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => { dispatchForm({ type: "SET", field: "email", value: e.target.value }); dispatch(clearSubmitError()); }}
                  aria-describedby={form.errors.email ? "err-email" : undefined}
                  style={{ width: "100%", border: 0, borderBottom: `6px solid ${form.errors.email ? "#c0392b" : "#161616"}`, background: "transparent", fontSize: "20px", padding: "0.2rem 0.25rem 0.1rem", outline: "none", fontFamily: "inherit", color: "var(--ink)" }}
                />
              </div>
              {form.errors.email && <span id="err-email" style={{ fontSize: "16px", color: "#c0392b", marginTop: "-0.8rem" }}>{form.errors.email}</span>}

              {/* Password */}
              <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", alignItems: "end", columnGap: "0.6rem" }}>
                <label htmlFor="password" style={{ fontSize: "30px", lineHeight: 1, whiteSpace: "nowrap" }}>
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => { dispatchForm({ type: "SET", field: "password", value: e.target.value }); dispatch(clearSubmitError()); }}
                  aria-describedby={form.errors.password ? "err-password" : undefined}
                  style={{ width: "100%", border: 0, borderBottom: `6px solid ${form.errors.password ? "#c0392b" : "#161616"}`, background: "transparent", fontSize: "20px", padding: "0.2rem 0.25rem 0.1rem", outline: "none", fontFamily: "inherit", color: "var(--ink)" }}
                />
              </div>
              {form.errors.password && <span id="err-password" style={{ fontSize: "16px", color: "#c0392b", marginTop: "-0.8rem" }}>{form.errors.password}</span>}

              {/* Confirm Password */}
              <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", alignItems: "end", columnGap: "0.6rem" }}>
                <label htmlFor="confirm-password" style={{ fontSize: "30px", lineHeight: 1, whiteSpace: "nowrap" }}>
                  ยืนยันรหัสผ่าน
                </label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => { dispatchForm({ type: "SET", field: "confirmPassword", value: e.target.value }); dispatch(clearSubmitError()); }}
                  aria-describedby={form.errors.confirmPassword ? "err-confirm" : undefined}
                  style={{ width: "100%", border: 0, borderBottom: `6px solid ${form.errors.confirmPassword ? "#c0392b" : "#161616"}`, background: "transparent", fontSize: "20px", padding: "0.2rem 0.25rem 0.1rem", outline: "none", fontFamily: "inherit", color: "var(--ink)" }}
                />
              </div>
              {form.errors.confirmPassword && <span id="err-confirm" style={{ fontSize: "16px", color: "#c0392b", marginTop: "-0.8rem" }}>{form.errors.confirmPassword}</span>}
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
                gap: "1.6rem",
                padding: "8% 10% 7%",
              }}
            >
              {/* Top-level error (gender or API) */}
              {topError && (
                <p
                  role="alert"
                  aria-live="polite"
                  style={{ margin: 0, fontSize: "22px", color: "#c0392b", textAlign: "center" }}
                >
                  {topError}
                </p>
              )}

              {/* Character name */}
              <label
                htmlFor="character-name"
                style={{
                  width: "380px",
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
                  onChange={(e) => { dispatchForm({ type: "SET", field: "characterName", value: e.target.value }); dispatch(clearSubmitError()); }}
                  aria-describedby={form.errors.characterName ? "err-char" : undefined}
                  style={{
                    width: "100%",
                    border: 0,
                    borderRadius: "999px",
                    background: "var(--field-fill)",
                    color: "var(--ink)",
                    fontSize: "24px",
                    textAlign: "center",
                    padding: "0.55rem 1rem",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </label>
              {form.errors.characterName && <span id="err-char" style={{ fontSize: "16px", color: "#c0392b" }}>{form.errors.characterName}</span>}

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
                  <MaleFigure selected={form.gender === "male"} />
                  <span style={{ fontSize: "32px", lineHeight: 1 }}>ชาย</span>
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
                  <FemaleFigure selected={form.gender === "female"} />
                  <span style={{ fontSize: "32px", lineHeight: 1 }}>หญิง</span>
                </label>
              </div>

              {/* Submit button — DS-4 */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-pill-button"
                style={{
                  padding: "0.45em 1.1em",
                  fontSize: "40px",
                  fontWeight: 600,
                  marginTop: "0.3rem",
                  opacity: isSubmitting ? 0.6 : 1,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting ? "กำลังสร้างบัญชี…" : "ยืนยัน"}
              </button>
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

function MaleFigure({ selected }: { selected: boolean }) {
  const style: React.CSSProperties = {
    width: "160px",
    aspectRatio: "0.55 / 1",
    position: "relative",
    color: "#9dc6f2",
    filter: selected ? "drop-shadow(0 0 0.6rem rgba(23,152,190,0.22))" : undefined,
    transform: selected ? "translateY(-2px)" : undefined,
    transition: "filter 0.18s ease, transform 0.18s ease",
  };
  const part: React.CSSProperties = { position: "absolute", display: "block", background: "currentColor" };
  return (
    <span aria-hidden="true" style={style}>
      <span style={{ ...part, left: "50%", top: 0, width: "26%", aspectRatio: "1", borderRadius: "50%", transform: "translateX(-50%)" }} />
      <span style={{ ...part, left: "50%", top: "18%", width: "36%", height: "44%", borderRadius: "24px", transform: "translateX(-50%)" }} />
      <span style={{ ...part, width: "10%", height: "32%", top: "22%", left: "17%", borderRadius: "999px", transform: "rotate(17deg)", transformOrigin: "top center" }} />
      <span style={{ ...part, width: "10%", height: "32%", top: "22%", right: "17%", borderRadius: "999px", transform: "rotate(-17deg)", transformOrigin: "top center" }} />
      <span style={{ ...part, width: "11%", height: "37%", bottom: 0, left: "39%", borderRadius: "999px" }} />
      <span style={{ ...part, width: "11%", height: "37%", bottom: 0, right: "39%", borderRadius: "999px" }} />
    </span>
  );
}

function FemaleFigure({ selected }: { selected: boolean }) {
  const style: React.CSSProperties = {
    width: "160px",
    aspectRatio: "0.55 / 1",
    position: "relative",
    color: "#050505",
    filter: selected ? "drop-shadow(0 0 0.6rem rgba(23,152,190,0.22))" : undefined,
    transform: selected ? "translateY(-2px)" : undefined,
    transition: "filter 0.18s ease, transform 0.18s ease",
  };
  const part: React.CSSProperties = { position: "absolute", display: "block", background: "currentColor" };
  return (
    <span aria-hidden="true" style={style}>
      {/* Head */}
      <span style={{ ...part, left: "50%", top: 0, width: "26%", aspectRatio: "1", borderRadius: "50%", transform: "translateX(-50%)" }} />
      {/* Torso (triangle/dress top) */}
      <span style={{ position: "absolute", left: "50%", top: "18%", width: 0, height: 0, borderLeft: "30px solid transparent", borderRight: "30px solid transparent", borderBottom: "95px solid currentColor", background: "transparent", transform: "translateX(-50%)" }} />
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
