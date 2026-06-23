"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import BookShellSkeleton from "@/components/BookShellSkeleton";
import IconRail from "@/components/IconRail";
import { useQuiz } from "../../QuizProvider";
import styles from "../Quiz.module.css";

export default function ScorePage() {
  const router = useRouter();
  const { score, phase, isSubmittingScore } = useQuiz();

  useEffect(() => {
    // The attempt completes with phase "completed"; anything else (idle after a
    // refresh, or a direct visit) means there is no live attempt to score.
    if (phase !== "completed") {
      router.replace("/minigame");
    }
  }, [phase, router]);

  // The score is fetched from the server on completion. Show the book-shell
  // skeleton while that request is in flight; on failure the provider falls
  // back to a client-computed score, so `score` is eventually non-null.
  if (isSubmittingScore || !score) return <BookShellSkeleton variant="minigame" />;

  return (
    <BookShellLayout
      tight
      fitViewport
      rail={<IconRail />}
      left={
        <div className={styles.scoreLayoutLeft}>
          <div className={styles.scoreCompleteWrap}>
            {/* Snake art SVG */}
            <svg className={styles.scoreSnakeArt} viewBox="0 0 200 200" aria-hidden="true">
              <path d="M100 180 C115 165 115 150 100 140 C82 128 85 112 105 100 C128 87 128 68 105 55 C82 42 82 24 108 12"
                    stroke="#b06ac0" strokeWidth="9" strokeLinecap="round" fill="none"/>
              <path d="M85 155 C100 142 99 127 85 117 C67 104 69 88 91 76"
                    stroke="#55c8ce" strokeWidth="6.5" strokeLinecap="round" fill="none" opacity="0.75"/>
              <circle cx="108" cy="12" r="8" fill="#b06ac0"/>
              <path d="M104 8 L108 12 L112 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
            <h1 className={styles.scoreCompleteTitle}>การทดสอบ<br />เสร็จสิ้น!</h1>
            <p className={styles.scoreCompleteSub}>ทำข้อสอบครบ {score.total}/{score.total} ข้อ</p>
          </div>
        </div>
      }
      right={
        <div className={styles.scoreLayoutRight}>
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

          <div className={styles.scoreBox} aria-label="คุณสะสมแต้มได้ทั้งหมด">
            <p className={styles.scoreBoxLabel}>คุณสะสมแต้มได้ทั้งหมด</p>
            <p className={styles.scoreBoxValue}>
              {score.points} <span className={styles.scoreBoxUnit}>แต้ม</span>
            </p>
          </div>

          <div className={styles.scoreDetailRow} aria-label="สรุปผลทดสอบ">
            <div className={styles.scoreDetailChip}>ถูก {score.correctCount} ข้อ</div>
            <div className={styles.scoreDetailChip}>ผิด {score.wrongCount} ข้อ</div>
          </div>

          <Link className={styles.scoreContinueBtn} href="/home" aria-label="เดินทางต่อ กลับหน้าหลัก">
            เดินทางต่อ
          </Link>
        </div>
      }
    />
  );
}
