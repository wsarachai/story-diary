"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetMeQuery, useLogoutMutation } from "@/store/authApi";
import type { User } from "@/types/auth";

export default function ProfilePage() {
  const { data: user, isLoading } = useGetMeQuery();
  const [logout] = useLogoutMutation();
  const router = useRouter();

  if (isLoading || !user) return null;

  const handleLogout = async () => {
    await logout().unwrap();
    router.replace("/login");
  };

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={<CharacterPanel user={user} />}
      right={<DetailsPanel user={user} onLogout={handleLogout} />}
    />
  );
}

function CharacterPanel({ user }: { user: User }) {
  const charImg = user.gender === "female" 
    ? "/images/chapter-speaker-girl-transparent.png" 
    : "/images/chapter-speaker-girl-transparent.png"; // Fallback to same for now if no boy img

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "2rem" }}>
      <div style={{ 
        width: "300px", 
        height: "300px", 
        borderRadius: "50%", 
        background: "rgba(255,255,255,0.3)", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        overflow: "hidden",
        border: "8px solid #fff",
        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)"
      }}>
        <Image 
          src={charImg} 
          alt="Character" 
          width={280} 
          height={280}
          style={{ transform: "scale(1.8) translateY(20px)" }}
        />
      </div>
      <h1 style={{ fontSize: "52px", fontWeight: 600, margin: 0, color: "var(--ink)" }}>
        {user.characterName}
      </h1>
    </div>
  );
}

function DetailsPanel({ user, onLogout }: { user: User; onLogout: () => void }) {
  const createdDate = new Date(user.createdAt).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ padding: "10% 12% 8%", height: "100%", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      <header>
        <h2 style={{ fontSize: "48px", fontWeight: 600, margin: "0 0 1rem" }}>ข้อมูลส่วนตัว</h2>
        <div style={{ height: "4px", width: "80px", background: "#ff3131", borderRadius: "2px" }} />
      </header>

      <section style={{ display: "grid", gap: "1.8rem", fontSize: "28px" }}>
        <div style={{ display: "grid", gap: "0.4rem" }}>
          <span style={{ fontWeight: 600, color: "rgba(0,0,0,0.5)", fontSize: "22px" }}>ชื่อ-นามสกุล</span>
          <p style={{ margin: 0 }}>{user.name}</p>
        </div>

        <div style={{ display: "grid", gap: "0.4rem" }}>
          <span style={{ fontWeight: 600, color: "rgba(0,0,0,0.5)", fontSize: "22px" }}>เบอร์โทรศัพท์</span>
          <p style={{ margin: 0 }}>{user.tel}</p>
        </div>

        <div style={{ display: "grid", gap: "0.4rem" }}>
          <span style={{ fontWeight: 600, color: "rgba(0,0,0,0.5)", fontSize: "22px" }}>สมาชิกตั้งแต่</span>
          <p style={{ margin: 0 }}>{createdDate}</p>
        </div>
      </section>

      <footer style={{ marginTop: "auto", display: "flex", justifyContent: "center" }}>
        <button
          onClick={onLogout}
          className="rounded-pill-button"
          style={{
            background: "#c0392b",
            color: "#fff",
            fontSize: "32px",
            padding: "0.8rem 2.5rem",
            width: "100%",
            boxShadow: "0 8px 20px -6px rgba(192, 57, 43, 0.4)"
          }}
        >
          ออกจากระบบ
        </button>
      </footer>
    </div>
  );
}
