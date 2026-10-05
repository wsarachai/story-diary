import type { Metadata } from "next";
import { fontVariables } from "./fonts/fonts";
import "./globals.css";
import { Providers } from "@/components/Providers";
import AuthProbe from "@/components/AuthProbe";
import { Analytics } from "@vercel/analytics/next";

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
    <html lang="th" className={fontVariables}>
      <body suppressHydrationWarning>
        <Providers>
          <AuthProbe />
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
