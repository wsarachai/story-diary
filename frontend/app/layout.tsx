import type { Metadata } from "next";
import { Baloo_2, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import AuthProbe from "@/components/AuthProbe";

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
        <Providers>
          <AuthProbe />
          {children}
        </Providers>
      </body>
    </html>
  );
}
