"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { RAIL_ITEMS } from "@/types/navigation";
import type { NavRailKey } from "@/types/navigation";

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
    </nav>
  );
}
