"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { RAIL_ITEMS } from "@/types/navigation";
import type { NavRailKey } from "@/types/navigation";
import { useGetMeQuery } from "@/store/authApi";
import styles from "./IconRail.module.css";

function getActiveKey(pathname: string): NavRailKey | null {
  if (pathname.startsWith("/home")) return "home";
  if (pathname.startsWith("/chapters") || pathname.startsWith("/video-clips")) return "chapters";
  if (pathname.startsWith("/habit")) return "habit";
  if (pathname.startsWith("/minigame")) return "minigame";
  return null;
}

const ADMIN_ACCENT = "#3b82f6";

export default function IconRail() {
  const pathname = usePathname();
  const activeKey = getActiveKey(pathname);
  const { data: user } = useGetMeQuery();
  const isAdmin = user?.role === "admin" || user?.role === "rootAdmin";
  const adminActive = pathname.startsWith("/admin");

  return (
    <nav className={styles.iconRail} aria-label="Main navigation">
      {RAIL_ITEMS.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={[styles.iconRailLink, isActive && styles.isActive].filter(Boolean).join(" ")}
            aria-label={item.ariaLabel}
            aria-current={isActive ? "page" : undefined}
            style={isActive ? ({ "--rail-accent": item.activeAccent } as React.CSSProperties) : undefined}
          >
            <Image
              src={`/icons/${item.icon}`}
              alt=""
              width={72}
              height={72}
            />
          </Link>
        );
      })}

      {isAdmin && (
        <div className={styles.iconRailAdminWrap}>
          <Link
            href="/admin"
            className={[styles.iconRailLink, adminActive && styles.isActive].filter(Boolean).join(" ")}
            aria-label="ไปหน้าจัดการ Admin"
            aria-current={adminActive ? "page" : undefined}
            style={adminActive ? ({ "--rail-accent": ADMIN_ACCENT } as React.CSSProperties) : undefined}
          >
            <div className={styles.adminIconImg} aria-hidden="true" />
          </Link>
        </div>
      )}
    </nav>
  );
}
