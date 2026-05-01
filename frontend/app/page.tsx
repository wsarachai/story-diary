"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import { selectAuthStatus, selectIsAuthed } from "@/store/authSlice";

/**
 * s001 Landing Screen — public entry point.
 * DS-2: already-authed users are redirected to /home.
 * DS-1: while status is "unknown", the CTA is disabled (aria-busy).
 */
export default function LandingPage() {
  const router = useRouter();
  const status = useAppSelector(selectAuthStatus);
  const isAuthed = useAppSelector(selectIsAuthed);

  useEffect(() => {
    if (isAuthed) {
      router.replace("/home");
    }
  }, [isAuthed, router]);

  const isPending = status === "unknown";

  return (
    <main
      className="screen screen-landscape"
      aria-label="Story Diary Landing"
      style={{ isolation: "isolate" }}
    >
      {/* Decorative paper/envelope element */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "13%",
          top: "30%",
          width: "41%",
          aspectRatio: "1.3 / 0.75",
          background: "#f8f2df",
          transform: "rotate(-19deg)",
          borderRadius: "6px",
          boxShadow: "0 18px 24px -16px rgba(0,0,0,0.35)",
          zIndex: 1,
        }}
      />

      {/* Book panel */}
      <section
        style={{
          position: "absolute",
          right: "6%",
          top: "4%",
          width: "44%",
          height: "88%",
          borderRadius: "54px",
          background: "#4ec6d1",
          boxShadow: "inset 0 -10px 30px rgba(0,0,0,0.05)",
          zIndex: 2,
          overflow: "hidden",
        }}
      >
        {/* Book spine */}
        <div
          aria-hidden="true"
          style={{
            width: "11%",
            height: "100%",
            background: "linear-gradient(180deg, #0f9eb5 0%, #0e98af 100%)",
          }}
        />

        {/* Book content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            alignContent: "center",
            justifyItems: "center",
            gap: "8%",
            padding: "0 8%",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-baloo2), cursive",
              fontSize: "72px",
              lineHeight: 0.95,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: "#071018",
            }}
          >
            Story
            <br />
            Diary
          </h1>

          {isPending ? (
            <button
              type="button"
              disabled
              aria-busy="true"
              aria-label="เริ่มใช้งาน Story Diary"
              style={{
                border: 0,
                borderRadius: "42px",
                background: "#d7ece5",
                color: "#06080a",
                fontWeight: 600,
                fontSize: "40px",
                letterSpacing: "0.01em",
                lineHeight: 1,
                padding: "0.7em 1.2em",
                opacity: 0.6,
                cursor: "not-allowed",
                fontFamily: "inherit",
              }}
            >
              -กดเพื่อเริ่ม-
            </button>
          ) : (
            <Link
              href="/login"
              role="button"
              aria-label="เริ่มใช้งาน Story Diary"
              className="start-button"
              style={{
                border: 0,
                borderRadius: "42px",
                background: "#d7ece5",
                color: "#06080a",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "40px",
                letterSpacing: "0.01em",
                lineHeight: 1,
                padding: "0.7em 1.2em",
                transition: "transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease",
                boxShadow: "0 11px 24px -14px rgba(0,0,0,0.55)",
                zIndex: 3,
                display: "inline-block",
              }}
            >
              -กดเพื่อเริ่ม-
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
