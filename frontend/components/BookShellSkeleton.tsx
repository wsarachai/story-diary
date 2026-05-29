/**
 * BookShellSkeleton — server-safe loading placeholder for page transitions.
 *
 * Used by every loading.tsx file. Renders instantly (no JS, no client hooks)
 * and mirrors the book-shell two-page layout so the skeleton matches the page
 * shape exactly, eliminating the blank-screen flash on first navigation.
 *
 * Props allow each route to show a skeleton that hints at its own content
 * (e.g. list rows vs. card blocks vs. grid cells).
 */

interface SkelLineProps {
  width?: string;
  height?: string;
  delay?: string;
}

function SkelLine({ width = "60%", height = "0.85em", delay = "0s" }: SkelLineProps) {
  return (
    <div
      className="skel-line"
      style={{ width, height, animationDelay: delay }}
    />
  );
}

function SkelBlock({ width = "100%", height = "3.5em", delay = "0s" }: SkelLineProps) {
  return (
    <div
      className="skel-block"
      style={{ width, height, animationDelay: delay }}
    />
  );
}

/** Thin horizontal rule placeholder */
function SkelRule() {
  return (
    <div
      className="skel-line"
      style={{ width: "100%", height: "2px", opacity: 0.5, animationDelay: "0.1s" }}
    />
  );
}

/** Static icon rail — same shape as <IconRail> but with grey placeholder circles. */
function StaticRail() {
  return (
    <div
      style={{
        display: "grid",
        alignContent: "start",
        gap: "0.9rem",
        padding: "1.8rem 1.4rem 1.8rem 0",
      }}
      aria-hidden="true"
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="skel-block"
          style={{
            width: "4.5rem",
            height: "4.5rem",
            borderRadius: "0 1.3rem 1.3rem 0",
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Page-specific content skeletons ─────────────────────────────────────────

/** Home left page: story-card oval */
function HomeLeft() {
  return (
    <div style={{ display: "grid", placeItems: "center", height: "100%", padding: "8%" }}>
      <div
        className="skel-block"
        style={{
          width: "72%",
          aspectRatio: "0.65",
          borderRadius: "38% 38% 9% 9% / 20% 20% 9% 9%",
        }}
      />
    </div>
  );
}

/** Home right page: date line + two feature cards */
function HomeRight() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "1.5rem", padding: "7%" }}>
      <SkelLine width="45%" height="1em" />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SkelLine width="30%" height="1.8em" delay="0.1s" />
      </div>
      <SkelBlock width="100%" height="30%" delay="0.15s" />
      <SkelBlock width="100%" height="26%" delay="0.22s" />
    </div>
  );
}

/** Chapters left/right: title + rule + chapter list rows */
function ChapterList() {
  return (
    <div style={{ padding: "7% 6%", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
      <SkelLine width="50%" height="1.6em" />
      <SkelRule />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div className="skel-circle" style={{ width: "2.2em", height: "2.2em", flexShrink: 0, animationDelay: `${i * 0.08}s` }} />
          <SkelLine width={`${55 + (i % 3) * 15}%`} height="1em" delay={`${0.05 + i * 0.08}s`} />
        </div>
      ))}
    </div>
  );
}

/** Habit: title + date + 3 tab chips + 4 entry rows */
function HabitEntries() {
  return (
    <div style={{ padding: "4% 5%", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <SkelLine width="9em" height="1.6em" />
          <SkelLine width="12em" height="0.8em" delay="0.08s" />
        </div>
        <div className="skel-circle" style={{ width: "2em", height: "2em" }} />
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {[0, 1, 2].map((i) => (
          <SkelLine key={i} width="6em" height="1.6em" delay={`${i * 0.08}s`} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginTop: "0.2rem" }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="skel-block"
            style={{ width: "100%", height: "3.2em", borderRadius: "12px", animationDelay: `${0.1 + i * 0.08}s` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Minigame: heart row + title + big start button */
function MinigameCard() {
  return (
    <div style={{ padding: "7%", display: "flex", flexDirection: "column", gap: "1.4rem" }}>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="skel-circle" style={{ width: "2.4em", height: "2.4em", animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <SkelLine width="60%" height="2em" delay="0.1s" />
      <SkelLine width="80%" height="0.9em" delay="0.18s" />
      <SkelLine width="70%" height="0.9em" delay="0.22s" />
      <div style={{ marginTop: "auto" }}>
        <SkelBlock width="50%" height="3em" delay="0.28s" />
      </div>
    </div>
  );
}

// ─── Public component ──────────────────────────────────────────────────────

export type SkeletonVariant = "home" | "chapters" | "habit" | "minigame" | "generic";

interface Props {
  variant?: SkeletonVariant;
}

export default function BookShellSkeleton({ variant = "generic" }: Props) {
  const left = (() => {
    switch (variant) {
      case "home":     return <HomeLeft />;
      case "chapters": return <ChapterList />;
      case "habit":    return <HabitEntries />;
      case "minigame": return <MinigameCard />;
      default:         return (
        <div style={{ padding: "7%", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <SkelLine width="50%" height="1.5em" />
          <SkelRule />
          <SkelBlock height="8em" delay="0.1s" />
          <SkelBlock height="6em" delay="0.18s" />
        </div>
      );
    }
  })();

  const right = (() => {
    switch (variant) {
      case "home":     return <HomeRight />;
      case "chapters": return <ChapterList />;
      case "habit":
      case "minigame":
      case "generic":
      default:
        return (
          <div style={{ padding: "7%", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <SkelLine width="40%" height="1.4em" />
            <SkelRule />
            <SkelBlock height="7em" delay="0.12s" />
            <SkelBlock height="5em" delay="0.2s" />
            <SkelBlock height="5em" delay="0.28s" />
          </div>
        );
    }
  })();

  return (
    <main
      className="screen screen-landscape"
      aria-label="กำลังโหลด…"
      aria-busy="true"
    >
      <section
        className="book-shell book-shell-tight"
        style={{ gridTemplateColumns: "1fr 1fr auto" }}
      >
        <section className="page page-left page-seam-right">{left}</section>
        <section className="page page-right">{right}</section>
        <StaticRail />
      </section>
    </main>
  );
}
