"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, NotebookPen, Gamepad2, Settings } from "lucide-react";
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

const RAIL_ICONS: Record<NavRailKey, React.ComponentType<{ className?: string }>> = {
  home: Home,
  chapters: BookOpen,
  habit: NotebookPen,
  minigame: Gamepad2,
};

const ADMIN_ACCENT = "#3b82f6";

interface IconRailProps {
  /**
   * Optional click interceptor. Called before navigation for every rail link.
   * Call `e.preventDefault()` to block the navigation (e.g. the quiz uses this
   * to show its abandon-confirmation dialog while a quiz is in progress).
   */
  onNavigate?: (href: string, e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export default function IconRail({ onNavigate }: IconRailProps) {
  const pathname = usePathname();
  const activeKey = getActiveKey(pathname);
  const { data: user } = useGetMeQuery();
  const isAdmin = user?.role === "admin" || user?.role === "rootAdmin";
  const adminActive = pathname.startsWith("/admin");

  return (
    <nav className={styles.iconRail} aria-label="Main navigation">
      {RAIL_ITEMS.map((item) => {
        const isActive = item.key === activeKey;
        const Icon = RAIL_ICONS[item.key];
        return (
          <Link
            key={item.key}
            href={item.href}
            className={[styles.iconRailLink, isActive && styles.isActive].filter(Boolean).join(" ")}
            aria-label={item.ariaLabel}
            aria-current={isActive ? "page" : undefined}
            style={{ "--rail-accent": item.activeAccent } as React.CSSProperties}
            onClick={(e) => onNavigate?.(item.href, e)}
          >
            <span className={styles.railTile} aria-hidden="true">
              <Icon className={styles.railIcon} />
            </span>
          </Link>
        );
      })}

      {isAdmin && (
        <Link
          href="/admin"
          className={[styles.iconRailLink, adminActive && styles.isActive].filter(Boolean).join(" ")}
          aria-label="ไปหน้าจัดการ Admin"
          aria-current={adminActive ? "page" : undefined}
          style={{ "--rail-accent": ADMIN_ACCENT } as React.CSSProperties}
          onClick={(e) => onNavigate?.("/admin", e)}
        >
          <span className={styles.railTile} aria-hidden="true">
            <Settings className={styles.railIcon} />
          </span>
        </Link>
      )}
    </nav>
  );
}
