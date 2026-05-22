"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useQuiz } from "../../QuizProvider";

export default function ScorePage() {
  const router = useRouter();
  const { score, phase } = useQuiz();

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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1.4rem" }}>
          <div className="score-complete-wrap">
            {/* Snake art SVG */}
            <svg className="score-snake-art" viewBox="0 0 200 200" aria-hidden="true">
              <path d="M100 180 C115 165 115 150 100 140 C82 128 85 112 105 100 C128 87 128 68 105 55 C82 42 82 24 108 12"
                    stroke="#b06ac0" strokeWidth="9" strokeLinecap="round" fill="none"/>
              <path d="M85 155 C100 142 99 127 85 117 C67 104 69 88 91 76"
                    stroke="#55c8ce" strokeWidth="6.5" strokeLinecap="round" fill="none" opacity="0.75"/>
              <circle cx="108" cy="12" r="8" fill="#b06ac0"/>
              <path d="M104 8 L108 12 L112 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
            <h1 className="score-complete-title">การทดสอบ<br />เสร็จสิ้น!</h1>
            <p className="score-complete-sub">ทำข้อสอบครบ {score.total}/{score.total} ข้อ</p>
          </div>
        </div>
      }
      right={
        <div style={{ padding: "5% 7% 5%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.4rem", position: "relative" }}>
          {/* Sparkle stars decoration */}
          <svg style={{ position: "absolute", top: "4%", right: "4%", width: "7rem", pointerEvents: "none" }} viewBox="0 0 220 160" fill="none" aria-hidden="true">
            <g fill="#f5e441">
              <path d="M52 10 L56 42 L88 46 L56 50 L52 82 L48 50 L16 46 L48 42 Z"/>
              <path d="M152 24 L155 45 L176 48 L155 51 L152 72 L149 51 L128 48 L149 45 Z"/>
              <path d="M118 78 L123 116 L161 121 L123 126 L118 164 L113 126 L75 121 L113 116 Z"/>
              <circle cx="196" cy="12" r="5"/>
              <circle cx="183" cy="86" r="4"/>
              <circle cx="38" cy="148" r="4"/>
            </g>
          </svg>

          <div className="score-box" aria-label="คุณสะสมแต้มได้ทั้งหมด">
            <p className="score-box-label">คุณสะสมแต้มได้ทั้งหมด</p>
            <p className="score-box-value">
              {score.points} <span className="score-box-unit">แต้ม</span>
            </p>
          </div>

          <div className="score-detail-row" aria-label="สรุปผลทดสอบ">
            <div className="score-detail-chip">ถูก {score.correctCount} ข้อ</div>
            <div className="score-detail-chip">ผิด {score.wrongCount} ข้อ</div>
          </div>

          <Link className="score-continue-btn" href="/home" aria-label="เดินทางต่อ กลับหน้าหลัก">
            เดินทางต่อ
          </Link>
        </div>
      }
    />
  );
}
