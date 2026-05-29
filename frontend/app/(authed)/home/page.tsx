"use client";

import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import Image from "next/image";
import { useGetMeQuery } from "@/store/authApi";
import { DateFull } from "@/components/DateBadge";
import PageSpinner from "@/components/PageSpinner";

/**
 * s004 Home Screen — authenticated entry hub.
 * Left page: story card preview.
 * Right page: feature cards for habit tracker + minigame.
 */
export default function HomePage() {
  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={<StoryCardPanel />}
      right={<DashboardPanel />}
    />
  );
}

function StoryCardPanel() {
  return (
    <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
      <Link
        href="/chapters"
        aria-label="ไปหน้าเนื้อเรื่อง"
        style={{
          width: "72%",
          height: "86%",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <article
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "38% 38% 9% 9% / 20% 20% 9% 9%",
            background: "#55d0d7",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <h1
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: "10%",
              margin: 0,
              textAlign: "center",
              fontSize: "56px",
              fontWeight: 500,
              zIndex: 1,
            }}
          >
            เนื้อเรื่อง
          </h1>
        </article>
      </Link>
    </div>
  );
}

function DashboardPanel() {
  const { data: user, isLoading: userLoading } = useGetMeQuery();
  const isAdmin = user?.role === "admin";

  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        gridTemplateRows: isAdmin ? "auto auto 1fr 1fr auto" : "auto auto 1fr 1fr",
        gap: "1.2rem",
        padding: "7% 7% 6%",
      }}
    >
      {/* Date */}
      <DateFull />

      {/* Profile link */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link
          href="/profile"
          aria-label="ไปหน้าโปรไฟล์"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
            color: "var(--ink)",
            fontSize: "24px",
            fontWeight: 500,
            background: "rgba(255,255,255,0.4)",
            padding: "0.4rem 1rem",
            borderRadius: "999px",
          }}
        >
          <span style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userLoading
              ? <PageSpinner variant="small" label="กำลังโหลด…" />
              : (user?.characterName || "โปรไฟล์")
            }
          </span>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#fff", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Image
                src="/images/chapter-speaker-girl-transparent.png"
                alt=""
                width={24}
                height={24}
                style={{ transform: "scale(2) translateY(2px)" }}
              />
            )}
          </div>
        </Link>
      </div>

      {/* Habit tracker card */}
      <Link
        href="/habit"
        aria-label="ไปหน้า Habit tracker"
        style={{
          position: "relative",
          borderRadius: "48px",
          background: "#59d6dc",
          padding: "1.6rem 1.8rem",
          textDecoration: "none",
          color: "var(--ink)",
          display: "block",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "40px",
            fontWeight: 500,
            lineHeight: 1.05,
          }}
        >
          Habit tracker
        </h2>
      </Link>

      {/* Minigame card — align-self end so it fills remaining space */}
      <Link
        href="/minigame"
        aria-label="ไปหน้ามินิเกม"
        style={{
          position: "relative",
          borderRadius: "48px",
          background: "#59d6dc",
          padding: "2.3rem 1.8rem 1.6rem",
          textDecoration: "none",
          color: "var(--ink)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          alignSelf: "end",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "1.88rem",
            top: "1.5rem",
            display: "flex",
            gap: "0.45rem",
          }}
        >
          {[0, 1, 2].map((i) => (
            <Image
              key={i}
              src="/icons/heart.svg"
              alt=""
              width={48}
              height={48}
            />
          ))}
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: "40px",
            fontWeight: 500,
            lineHeight: 1.05,
          }}
        >
          Minigame
        </h2>
      </Link>

      {/* Admin card — bottom of dashboard, admins only */}
      {isAdmin && (
        <Link href="/admin" className="admin-home-card" aria-label="ไปหน้าจัดการ Admin">
          <div className="admin-home-card-text">
            <h2>Admin Panel</h2>
            <p>จัดการข้อมูล · บทเรียน · คำถาม</p>
          </div>
          <div className="admin-home-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: "1.4rem", height: "1.4rem" }}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
        </Link>
      )}
    </div>
  );
}
