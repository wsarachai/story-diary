"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const NAV_ICONS: Record<string, React.ReactNode> = {
  Dashboard: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: "1em", height: "1em", flexShrink: 0 }}
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Chapters: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: "1em", height: "1em", flexShrink: 0 }}
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  "E-Books": (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: "1em", height: "1em", flexShrink: 0 }}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  ),
  Minigame: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: "1em", height: "1em", flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  Home: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: "1em", height: "1em", flexShrink: 0 }}
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
};

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Chapters", href: "/admin/chapters" },
  { label: "E-Books", href: "/admin/e-books" },
  { label: "Minigame", href: "/admin/minigame" },
  { label: "Home", href: "/home" },
];

export default function AdminSidebar({ hideTopbar = false }: { hideTopbar?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────── */}
      {!hideTopbar && (
        <div className="admin-topbar">
          <button
            className="admin-hamburger"
            aria-label="เปิดเมนู"
            onClick={() => setOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ width: "1.2rem", height: "1.2rem" }}
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="admin-topbar-title">Admin Panel</span>
        </div>
      )}

      {/* ── Overlay backdrop ────────────────────────── */}
      <div
        className={`admin-sidebar-overlay${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside
        className={`admin-sidebar${open ? " open" : ""}`}
        aria-label="Admin navigation"
      >
        {/* Close button — mobile only (via CSS visibility) */}
        <div
          className="admin-sidebar-brand"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1>Story Diary</h1>
            <p>Admin Panel</p>
          </div>
          <button
            className="admin-hamburger"
            aria-label="ปิดเมนู"
            onClick={() => setOpen(false)}
            style={{ marginLeft: "auto" }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ width: "1rem", height: "1rem" }}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-link${isActive ? " active" : ""}`}
              >
                {NAV_ICONS[item.label]}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
