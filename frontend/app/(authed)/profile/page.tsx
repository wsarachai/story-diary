"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetMeQuery, useLogoutMutation } from "@/store/authApi";
import { useUpdateProfileMutation } from "@/store/userApi";
import type { User } from "@/types/auth";
import { isApiError } from "@/types/error";
import type { UpdateUserRequest } from "@/types/user";
import styles from "./profile.module.css";
import sharedStyles from "@/components/Shared.module.css";

const AVATAR_MAX_SOURCE_FILE_BYTES = 2 * 1024 * 1024;
const AVATAR_MAX_SOURCE_SIDE = 2048;
const AVATAR_MAX_STORED_BYTES = 180 * 1024;

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = { width: img.width, height: img.height };
      URL.revokeObjectURL(url);
      resolve(size);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("IMAGE_LOAD_FAILED"));
    };
    img.src = url;
  });
}

function extractAvatarErrorMessage(err: unknown): string {
  if (typeof err !== "object" || err === null || !("data" in err)) {
    return "เกิดข้อผิดพลาดในการอัปโหลดรูปโปรไฟล์";
  }

  const data = (err as { data?: unknown }).data;
  if (!isApiError(data)) {
    return "เกิดข้อผิดพลาดในการอัปโหลดรูปโปรไฟล์";
  }

  const detail = data.error.details?.find((d) => d.field === "avatarUrl");
  if (detail?.code === "TOO_LONG") {
    return "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 180KB และความละเอียดไม่เกิน 256x256 พิกเซล";
  }
  if (detail?.code === "INVALID_FORMAT") {
    return "รองรับเฉพาะไฟล์รูปภาพ JPEG หรือ PNG เท่านั้น";
  }

  return "เกิดข้อผิดพลาดในการอัปโหลดรูปโปรไฟล์";
}

// ── Client-side image resize: max 256×256 JPEG via canvas ───────────────────
function resizeToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 256;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: user, isLoading } = useGetMeQuery();
  const [logout] = useLogoutMutation();
  const router = useRouter();

  if (isLoading || !user) return null;

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={<AvatarPanel user={user} />}
      right={<EditPanel user={user} onLogout={handleLogout} />}
    />
  );
}

// ── Left page ─ avatar showcase ─────────────────────────────────────────────
function AvatarPanel({ user }: { user: User }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [updateProfile, { isLoading: uploading }] = useUpdateProfileMutation();
  const [avatarError, setAvatarError] = useState("");

  const charImg = "/images/chapter-speaker-girl-transparent.png";
  const hasAvatar = Boolean(user.avatarUrl);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError("");

    if (!file.type.startsWith("image/")) {
      setAvatarError("รองรับเฉพาะไฟล์รูปภาพเท่านั้น");
      e.target.value = "";
      return;
    }

    if (file.size > AVATAR_MAX_SOURCE_FILE_BYTES) {
      setAvatarError("ไฟล์รูปมีขนาดใหญ่เกินไป กรุณาเลือกไฟล์ไม่เกิน 2MB");
      e.target.value = "";
      return;
    }

    try {
      const sourceSize = await readImageSize(file);
      if (sourceSize.width > AVATAR_MAX_SOURCE_SIDE || sourceSize.height > AVATAR_MAX_SOURCE_SIDE) {
        setAvatarError("รูปต้นฉบับมีความละเอียดสูงเกินไป กรุณาใช้รูปไม่เกิน 2048x2048 พิกเซล");
        return;
      }

      const base64 = await resizeToBase64(file);
      if (estimateDataUrlBytes(base64) > AVATAR_MAX_STORED_BYTES) {
        setAvatarError("รูปโปรไฟล์ต้องมีขนาดไม่เกิน 180KB");
        return;
      }

      await updateProfile({ avatarUrl: base64 }).unwrap();
    } catch (err) {
      setAvatarError(extractAvatarErrorMessage(err));
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className={styles.profLeft}>
      {/* decorative teal backdrop blob */}
      <div className={styles.profBackdrop} aria-hidden="true" />

      {/* avatar + camera button */}
      <div className={styles.profAvatarWrap}>
        <div className={styles.profAvatarRing}>
          {hasAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl!}
              alt="รูปโปรไฟล์"
              className={styles.profAvatarPhoto}
            />
          ) : (
            <Image
              src={charImg}
              alt="ตัวละคร"
              width={220}
              height={220}
              className={styles.profAvatarChar}
              priority
            />
          )}
        </div>

        {/* floating camera FAB */}
        <button
          className={styles.profCamFab}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label="เปลี่ยนรูปโปรไฟล์"
        >
          {uploading ? (
            <span className={styles.profCamSpinner} aria-hidden="true" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className={styles.srOnly}
        onChange={handleFileChange}
        tabIndex={-1}
      />

      <h1 className={styles.profCharName}>{user.characterName}</h1>

      {avatarError && (
        <p className={`${styles.profFeedback} ${styles.profFeedbackErr} ${styles.profAvatarFeedback}`} role="alert">
          {avatarError}
        </p>
      )}

      <span className={`${styles.profGenderBadge} ${user.gender === "female" ? styles.profGenderBadgeFemale : styles.profGenderBadgeMale}`}>
        {user.gender === "female" ? "หญิง" : "ชาย"}
      </span>
    </div>
  );
}

// ── Right page ─ edit form ───────────────────────────────────────────────────
function EditPanel({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [updateProfile, { isLoading, isSuccess, isError }] = useUpdateProfileMutation();

  const [form, setForm] = useState({
    name: user.name,
    characterName: user.characterName,
    gender: user.gender as "male" | "female",
  });
  const [dirty, setDirty] = useState(false);

  const set = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    const patch: UpdateUserRequest = {};
    if (form.name !== user.name) patch.name = form.name;
    if (form.characterName !== user.characterName) patch.characterName = form.characterName;
    if (form.gender !== user.gender) patch.gender = form.gender;
    if (!Object.keys(patch).length) return;
    await updateProfile(patch);
    setDirty(false);
  };

  const handleCancel = () => {
    setForm({ name: user.name, characterName: user.characterName, gender: user.gender });
    setDirty(false);
  };

  const createdDate = new Date(user.createdAt).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={styles.profRight}>
      {/* header */}
      <header className={styles.profHeader}>
        <h2 className={styles.profTitle}>ข้อมูลส่วนตัว</h2>
        <div className={styles.profTitleRule} aria-hidden="true" />
      </header>

      {/* form fields */}
      <div className={styles.profFields}>
        {/* name */}
        <div className={styles.profLineField}>
          <label className={styles.profLineLabel} htmlFor="prof-name">
            ชื่อ-นามสกุล
          </label>
          <input
            id="prof-name"
            className={styles.profLineInput}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={80}
          />
        </div>

        {/* character name */}
        <div className={styles.profLineField}>
          <label className={styles.profLineLabel} htmlFor="prof-char">
            ชื่อตัวละคร
          </label>
          <input
            id="prof-char"
            className={styles.profLineInput}
            value={form.characterName}
            onChange={(e) => set("characterName", e.target.value)}
            maxLength={40}
          />
        </div>

        {/* phone — read-only */}
        <div className={styles.profLineField}>
          <span className={styles.profLineLabel}>เบอร์โทรศัพท์</span>
          <p className={styles.profLineStatic}>{user.tel}</p>
        </div>

        {/* join date — read-only */}
        <div className={styles.profLineField}>
          <span className={styles.profLineLabel}>สมาชิกตั้งแต่</span>
          <p className={styles.profLineStatic}>{createdDate}</p>
        </div>

        {/* gender */}
        <div className={styles.profLineField}>
          <span className={styles.profLineLabel}>เพศ</span>
          <div className={styles.profGenderRow} role="group" aria-label="เลือกเพศ">
            {(["female", "male"] as const).map((g) => (
              <button
                key={g}
                type="button"
                className={`${styles.profGenderOpt} ${g === "female" ? styles.profGenderOptFemale : styles.profGenderOptMale}${form.gender === g ? ` ${styles.isActive}` : ""}`}
                onClick={() => set("gender", g)}
                aria-pressed={form.gender === g}
              >
                {g === "female" ? "หญิง" : "ชาย"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* save / error feedback */}
      {isSuccess && !dirty && (
        <p className={`${styles.profFeedback} ${styles.profFeedbackOk}`} role="status">
          บันทึกเรียบร้อยแล้ว ✓
        </p>
      )}
      {isError && (
        <p className={`${styles.profFeedback} ${styles.profFeedbackErr}`} role="alert">
          เกิดข้อผิดพลาด กรุณาลองอีกครั้ง
        </p>
      )}

      {/* actions */}
      <footer className={styles.profFooter}>
        {dirty && (
          <div className={styles.profEditBtns}>
            <button
              className={`${sharedStyles.roundedPillButton} ${styles.profBtnSave}`}
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? "กำลังบันทึก…" : "บันทึก"}
            </button>
            <button
              className={`${sharedStyles.roundedPillButton} ${styles.profBtnCancel}`}
              onClick={handleCancel}
              disabled={isLoading}
            >
              ยกเลิก
            </button>
          </div>
        )}
        <button
          className={`${sharedStyles.roundedPillButton} ${styles.profBtnLogout}`}
          onClick={onLogout}
        >
          ออกจากระบบ
        </button>
      </footer>
    </div>
  );
}
