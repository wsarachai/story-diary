import type { Metadata } from "next";
import { Baloo_2, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import AuthProbe from "@/components/AuthProbe";
import InitLoadingRemover from "@/components/InitLoadingRemover";

const baloo2 = Baloo_2({
  variable: "--font-baloo2",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Story Diary",
  description: "บันทึกเรื่องราวและติดตามนิสัยของคุณ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${baloo2.variable} ${notoSansThai.variable}`}
    >
      <body suppressHydrationWarning>
        <div
          id="init-loading"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.4rem",
            background: "linear-gradient(160deg, #3d2b1f 0%, #5c3d2a 50%, #3d2b1f 100%)",
            transition: "opacity 0.45s ease",
          }}
        >
          <div style={{
            width: "64px",
            height: "80px",
            borderRadius: "4px 14px 14px 4px",
            background: "linear-gradient(180deg, #e8dcc8 0%, #d4c4a0 100%)",
            boxShadow: "-4px 4px 18px rgba(0,0,0,0.45), inset -3px 0 8px rgba(0,0,0,0.15)",
            animation: "init-book-pulse 1.4s ease-in-out infinite",
          }} />
          <p style={{
            fontFamily: "var(--font-noto-sans-thai), sans-serif",
            color: "rgba(232, 220, 200, 0.75)",
            fontSize: "0.95rem",
            letterSpacing: "0.06em",
            margin: 0,
          }}>
            กำลังโหลด…
          </p>
          <style>{`
            @keyframes init-book-pulse {
              0%, 100% { transform: scaleY(1); opacity: 0.85; }
              50%       { transform: scaleY(1.07); opacity: 1; }
            }
          `}</style>
        </div>
        <InitLoadingRemover />
        <Providers>
          <AuthProbe />
          {children}
        </Providers>
      </body>
    </html>
  );
}
