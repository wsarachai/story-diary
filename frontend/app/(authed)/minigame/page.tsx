"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useQuiz } from "./QuizProvider";

export default function MinigamePage() {
  const router = useRouter();
  const { start, isLoading } = useQuiz();

  function handleStart() {
    start();
    router.push("/minigame/quiz?n=0");
  }

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={
        <div style={{ display: "grid", placeItems: "center", height: "100%", background: "#f5efe6", position: "relative", overflow: "hidden" }}>
          <div className="doodle-wrap" aria-hidden="true">
            <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M60 60 L63 70 L73 73 L63 76 L60 86 L57 76 L47 73 L57 70 Z" fill="#b06ac0" opacity="0.85"/>
              <path d="M330 80 L332 88 L340 90 L332 92 L330 100 L328 92 L320 90 L328 88 Z" fill="#b06ac0" opacity="0.7"/>
              <path d="M55 300 L57 307 L64 309 L57 311 L55 318 L53 311 L46 309 L53 307 Z" fill="#b06ac0" opacity="0.75"/>
              <path d="M350 260 L352 268 L360 270 L352 272 L350 280 L348 272 L340 270 L348 268 Z" fill="#55c8ce" opacity="0.7"/>
              <path d="M200 40 C300 40 360 100 360 200 C360 300 300 360 200 360 C100 360 40 300 40 200 C40 100 100 40 200 40" stroke="#55c8ce" strokeWidth="8" strokeLinecap="round" fill="none"/>
              <path d="M200 60 C290 60 340 110 340 200 C340 290 290 340 200 340 C110 340 60 290 60 200 C60 110 110 70 185 62" stroke="#b06ac0" strokeWidth="7" strokeLinecap="round" fill="none"/>
              <path d="M200 90 C270 90 310 130 310 200 C310 270 270 310 200 310 C130 310 90 270 90 200 C90 140 130 100 195 92" stroke="#55c8ce" strokeWidth="7" strokeLinecap="round" fill="none"/>
              <path d="M200 120 C255 120 280 155 280 200 C280 245 245 280 200 280 C155 280 120 245 120 200 C120 160 150 130 196 122" stroke="#b06ac0" strokeWidth="6.5" strokeLinecap="round" fill="none"/>
              <path d="M200 150 C235 150 250 170 250 200 C250 230 230 250 200 250 C170 250 150 230 150 200 C150 175 168 155 197 152" stroke="#55c8ce" strokeWidth="6" strokeLinecap="round" fill="none"/>
              <path d="M200 175 C218 175 225 188 225 200 C225 215 214 224 200 222 C188 220 178 210 180 198 C182 188 193 182 202 185" stroke="#b06ac0" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
              <path d="M202 185 C220 170 240 165 255 175" stroke="#55c8ce" strokeWidth="5" strokeLinecap="round" fill="none"/>
              <circle cx="255" cy="175" r="7" fill="#b06ac0" opacity="0.8"/>
              <circle cx="110" cy="310" r="9" fill="#b06ac0" opacity="0.65"/>
            </svg>
          </div>
        </div>
      }
      right={
        <div style={{ padding: "6% 8% 7%", display: "flex", flexDirection: "column", justifyContent: "center", gap: "2rem" }}>
          <p className="intro-text">พ่อมดแห่งหอคอย<br />ได้ส่งคุณเข้ามายัง<br />เมือง ๆ หนึ่ง</p>
          <div className="ornament" aria-hidden="true">
            <svg viewBox="0 0 220 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 30 Q55 10 110 30 Q165 50 210 30" stroke="#b06ac0" strokeWidth="4" strokeLinecap="round" fill="none"/>
              <path d="M30 30 Q80 5 110 30 Q140 55 190 30" stroke="#55c8ce" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7"/>
              <circle cx="110" cy="30" r="7" fill="#b06ac0"/>
              <circle cx="10" cy="30" r="5" fill="#55c8ce" opacity="0.8"/>
              <circle cx="210" cy="30" r="5" fill="#55c8ce" opacity="0.8"/>
            </svg>
          </div>
          <p className="ready-text">พร้อมทำแบบทดสอบ<br />แล้วหรือยัง?</p>
          <div className="ready-btns">
            <button
              className="ready-btn ready-btn-yes"
              onClick={handleStart}
              aria-label="เริ่มทำแบบทดสอบ"
              disabled={isLoading}
            >
              พร้อมแล้ว!
            </button>
            <Link className="ready-btn ready-btn-no" href="/home" aria-label="ยังไม่พร้อม กลับหน้าหลัก">
              ยังไม่พร้อม
            </Link>
          </div>
        </div>
      }
    />
  );
}

