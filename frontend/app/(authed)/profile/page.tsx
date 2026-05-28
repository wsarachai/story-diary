"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetMeQuery, useLogoutMutation } from "@/store/authApi";
import { useUpdateProfileMutation } from "@/store/userApi";
import type { User } from "@/types/auth";
import type { UpdateUserRequest } from "@/types/user";

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

  const charImg = "/images/chapter-speaker-girl-transparent.png";
  const hasAvatar = Boolean(user.avatarUrl);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await resizeToBase64(file);
      await updateProfile({ avatarUrl: base64 });
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="prof-left">
      {/* decorative teal backdrop blob */}
      <div className="prof-backdrop" aria-hidden="true" />

      {/* avatar + camera button */}
      <div className="prof-avatar-wrap">
        <div className="prof-avatar-ring">
          {hasAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl!}
              alt="รูปโปรไฟล์"
              className="prof-avatar-photo"
            />
          ) : (
            <Image
              src={charImg}
              alt="ตัวละคร"
              width={220}
              height={220}
              className="prof-avatar-char"
              priority
            />
          )}
        </div>

        {/* floating camera FAB */}
        <button
          className="prof-cam-fab"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label="เปลี่ยนรูปโปรไฟล์"
        >
          {uploading ? (
            <span className="prof-cam-spinner" aria-hidden="true" />
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
        className="sr-only"
        onChange={handleFileChange}
        tabIndex={-1}
      />

      <h1 className="prof-char-name">{user.characterName}</h1>

      <span className={`prof-gender-badge prof-gender-badge--${user.gender}`}>
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
    <div className="prof-right">
      {/* header */}
      <header className="prof-header">
        <h2 className="prof-title">ข้อมูลส่วนตัว</h2>
        <div className="prof-title-rule" aria-hidden="true" />
      </header>

      {/* form fields */}
      <div className="prof-fields">
        {/* name */}
        <div className="prof-line-field">
          <label className="prof-line-label" htmlFor="prof-name">
            ชื่อ-นามสกุล
          </label>
          <input
            id="prof-name"
            className="prof-line-input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={80}
          />
        </div>

        {/* character name */}
        <div className="prof-line-field">
          <label className="prof-line-label" htmlFor="prof-char">
            ชื่อตัวละคร
          </label>
          <input
            id="prof-char"
            className="prof-line-input"
            value={form.characterName}
            onChange={(e) => set("characterName", e.target.value)}
            maxLength={40}
          />
        </div>

        {/* phone — read-only */}
        <div className="prof-line-field">
          <span className="prof-line-label">เบอร์โทรศัพท์</span>
          <p className="prof-line-static">{user.tel}</p>
        </div>

        {/* join date — read-only */}
        <div className="prof-line-field">
          <span className="prof-line-label">สมาชิกตั้งแต่</span>
          <p className="prof-line-static">{createdDate}</p>
        </div>

        {/* gender */}
        <div className="prof-line-field">
          <span className="prof-line-label">เพศ</span>
          <div className="prof-gender-row" role="group" aria-label="เลือกเพศ">
            {(["female", "male"] as const).map((g) => (
              <button
                key={g}
                type="button"
                className={`prof-gender-opt prof-gender-opt--${g}${form.gender === g ? " is-active" : ""}`}
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
        <p className="prof-feedback prof-feedback--ok" role="status">
          บันทึกเรียบร้อยแล้ว ✓
        </p>
      )}
      {isError && (
        <p className="prof-feedback prof-feedback--err" role="alert">
          เกิดข้อผิดพลาด กรุณาลองอีกครั้ง
        </p>
      )}

      {/* actions */}
      <footer className="prof-footer">
        {dirty && (
          <div className="prof-edit-btns">
            <button
              className="rounded-pill-button prof-btn-save"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? "กำลังบันทึก…" : "บันทึก"}
            </button>
            <button
              className="rounded-pill-button prof-btn-cancel"
              onClick={handleCancel}
              disabled={isLoading}
            >
              ยกเลิก
            </button>
          </div>
        )}
        <button
          className="rounded-pill-button prof-btn-logout"
          onClick={onLogout}
        >
          ออกจากระบบ
        </button>
      </footer>
    </div>
  );
}
