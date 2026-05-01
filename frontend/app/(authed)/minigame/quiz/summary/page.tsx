"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useAppSelector } from "@/lib/hooks";
import { selectQuizScore, selectQuizPhase } from "@/store/quizSlice";

export default function SummaryPage() {
  const router = useRouter();
  const score = useAppSelector(selectQuizScore);
  const phase = useAppSelector(selectQuizPhase);

  useEffect(() => {
    if (phase !== "completed" && !score) {
      router.replace("/minigame");
    }
  }, [phase, score, router]);

  if (!score) return null;

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1.8rem", textAlign: "center" }}>
          <h1 className="summary-title">การทดสอบ<br />เสร็จสิ้น</h1>
          {/* Smoke wisp SVG from s031 wireframe */}
          <svg className="summary-smoke" viewBox="0 0 220 420" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M110 410 C125 390 125 375 112 362 C95 345 99 328 120 315 C145 299 145 278 120 262 C92 244 92 220 122 202 C150 185 152 163 126 145 C94 124 95 101 132 83 C160 69 163 47 145 20"
                  stroke="#f3ba66" strokeWidth="8" strokeLinecap="round" fill="none"/>
            <path d="M98 382 C115 368 114 352 100 341 C82 327 84 309 106 296 C130 282 130 264 107 248 C82 231 81 210 108 194"
                  stroke="#f3ba66" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.7"/>
            <path d="M130 360 C148 349 150 335 138 323 C125 310 128 295 146 285 C166 274 171 260 159 245 C148 231 149 216 165 205"
                  stroke="#f3ba66" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.6"/>
          </svg>
        </div>
      }
      right={
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "3rem", padding: "5% 8% 6%", position: "relative" }}>
          {/* Stars decoration */}
          <svg className="summary-stars" viewBox="0 0 220 160" fill="none" aria-hidden="true">
            <g fill="#f5e441">
              <path d="M52 10 L56 42 L88 46 L56 50 L52 82 L48 50 L16 46 L48 42 Z"/>
              <path d="M152 24 L155 45 L176 48 L155 51 L152 72 L149 51 L128 48 L149 45 Z"/>
              <path d="M118 78 L123 116 L161 121 L123 126 L118 164 L113 126 L75 121 L113 116 Z"/>
              <path d="M12 90 L15 110 L35 113 L15 116 L12 136 L9 116 L-11 113 L9 110 Z"/>
              <circle cx="196" cy="12" r="5"/>
              <circle cx="183" cy="86" r="4"/>
              <circle cx="38" cy="148" r="4"/>
              <circle cx="82" cy="118" r="3.5"/>
            </g>
          </svg>

          <p className="summary-score-text">
            คุณสะสมแต้มได้<br />ทั้งหมด {score.points} แต้ม
          </p>

          <Link className="summary-continue-btn" href="/home" aria-label="เดินทางต่อ กลับหน้าหลัก">
            เดินทางต่อ
          </Link>
        </div>
      }
    />
  );
}
