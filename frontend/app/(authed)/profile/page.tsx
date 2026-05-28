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

// ── Resize image to max 256×256 JPEG via canvas ─────────────────────────────
function resizeToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 256;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

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

// ── Left panel: avatar + character name ─────────────────────────────────────
function AvatarPanel({ user }: { user: User }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const [hover, setHover] = useState(false);

  const defaultImg =
    user.gender === "male"
      ? "/images/chapter-speaker-girl-transparent.png"
      : "/images/chapter-speaker-girl-transparent.png";

  const hasAvatar = Boolean(user.avatarUrl);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await resizeToBase64(file);
      await updateProfile({ avatarUrl: base64 });
    } catch {
      // silent — user can retry
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="profile-avatar-panel">
      {/* clickable avatar circle */}
      <button
        className="profile-avatar-btn"
        onClick={() => fileRef.current?.click()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label="เปลี่ยนรูปโปรไฟล์"
        disabled={isLoading}
      >
        {hasAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl!}
            alt="รูปโปรไฟล์"
            className="profile-avatar-img"
          />
        ) : (
          <Image
            src={defaultImg}
            alt="ตัวละคร"
            width={240}
            height={240}
            className="profile-avatar-char"
          />
        )}

        {/* overlay */}
        <span
          className="profile-avatar-overlay"
          aria-hidden="true"
          style={{ opacity: hover || isLoading ? 1 : 0 }}
        >
          {isLoading ? (
            <span className="profile-avatar-spinner" />
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
        </span>
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        tabIndex={-1}
      />

      <h1 className="profile-char-name">{user.characterName}</h1>
      <p className="profile-upload-hint">คลิกที่รูปเพื่อเปลี่ยน</p>
    </div>
  );
}

// ── Right panel: edit form + logout ─────────────────────────────────────────
function EditPanel({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [updateProfile, { isLoading, isSuccess, isError }] = useUpdateProfileMutation();

  const [form, setForm] = useState<{
    name: string;
    characterName: string;
    gender: "male" | "female";
  }>({
    name: user.name,
    characterName: user.characterName,
    gender: user.gender,
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
    if (Object.keys(patch).length === 0) return;
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
    <div className="profile-edit-panel">
      <header className="profile-edit-header">
        <h2>ข้อมูลส่วนตัว</h2>
        <div className="profile-edit-divider" />
      </header>

      <div className="profile-field-list">
        {/* Name */}
        <label className="profile-field">
          <span className="profile-field-label">ชื่อ-นามสกุล</span>
          <input
            className="profile-field-input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={80}
          />
        </label>

        {/* Character name */}
        <label className="profile-field">
          <span className="profile-field-label">ชื่อตัวละคร</span>
          <input
            className="profile-field-input"
            value={form.characterName}
            onChange={(e) => set("characterName", e.target.value)}
            maxLength={40}
          />
        </label>

        {/* Gender */}
        <div className="profile-field">
          <span className="profile-field-label">เพศ</span>
          <div className="profile-gender-row">
            {(["female", "male"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => set("gender", g)}
                className={`profile-gender-btn${form.gender === g ? " is-active" : ""}`}
              >
                {g === "female" ? "หญิง" : "ชาย"}
              </button>
            ))}
          </div>
        </div>

        {/* Member since (read-only) */}
        <div className="profile-field">
          <span className="profile-field-label">สมาชิกตั้งแต่</span>
          <p className="profile-field-static">{createdDate}</p>
        </div>

        {/* Phone (read-only) */}
        <div className="profile-field">
          <span className="profile-field-label">เบอร์โทรศัพท์</span>
          <p className="profile-field-static">{user.tel}</p>
        </div>
      </div>

      {/* Status feedback */}
      {isSuccess && !dirty && (
        <p className="profile-status profile-status--ok">บันทึกเรียบร้อยแล้ว</p>
      )}
      {isError && (
        <p className="profile-status profile-status--err">เกิดข้อผิดพลาด กรุณาลองใหม่</p>
      )}

      <footer className="profile-edit-footer">
        {dirty && (
          <>
            <button
              className="rounded-pill-button profile-btn-save"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? "กำลังบันทึก…" : "บันทึก"}
            </button>
            <button
              className="rounded-pill-button profile-btn-cancel"
              onClick={handleCancel}
              disabled={isLoading}
            >
              ยกเลิก
            </button>
          </>
        )}
        <button
          onClick={onLogout}
          className="rounded-pill-button profile-btn-logout"
        >
          ออกจากระบบ
        </button>
      </footer>
    </div>
  );
}
