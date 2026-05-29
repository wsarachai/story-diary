"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { RAIL_ITEMS } from "@/types/navigation";
import type { NavRailKey } from "@/types/navigation";
import { useGetMeQuery } from "@/store/authApi";

function getActiveKey(pathname: string): NavRailKey | null {
  if (pathname.startsWith("/home")) return "home";
  if (pathname.startsWith("/chapters") || pathname.startsWith("/video-clips")) return "chapters";
  if (pathname.startsWith("/habit")) return "habit";
  if (pathname.startsWith("/minigame")) return "minigame";
  return null;
}

export default function IconRail() {
  const pathname = usePathname();
  const activeKey = getActiveKey(pathname);
  const { data: user } = useGetMeQuery();
  const isAdmin = user?.role === "admin";

  return (
    <nav className="icon-rail" aria-label="Main navigation">
      {RAIL_ITEMS.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`icon-rail-link${isActive ? " is-active" : ""}`}
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
        <Link
          href="/admin"
          className="icon-rail-link icon-rail-admin"
          aria-label="ไปหน้าจัดการ Admin"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: "54%", height: "54%" }}>
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </Link>
      )}
    </nav>
  );
}
