"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetEBooksQuery } from "@/store/ebookApi";
import type { EBookChapter } from "@/types/ebook";

export default function EBookViewerPage() {
    const { data: collection } = useGetEBooksQuery();
    const params = useParams<{ id: string }>();
    const ebookId = params?.id ?? "";

    const activeEBook = useMemo(() => {
        return collection?.chapters.find(c => c.id === ebookId);
    }, [collection, ebookId]);

    return (
        <BookShellLayout
            tight
            rail={<IconRail />}
            left={<div />}
            right={<div />}
            mergedOnly
            merged={
                <div className="clip-player-page" style={{ background: "linear-gradient(165deg, #f0f7ff 0%, #e0eff5 55%, #d0e8f0 100%)" }}>
                    <div className="clip-player-page-header">
                        <Link href="/e-books" className="clip-player-back" style={{ background: "#508db9" }} aria-label="กลับหน้า E-book">
                            กลับ
                        </Link>
                        <h1 className="clip-player-title" style={{ color: "#2c5d80" }}>{activeEBook?.title ?? "ไม่พบ E-book"}</h1>
                    </div>

                    <div className="clip-player-frame-wrap" style={{ background: "#fff" }}>
                        {activeEBook?.pdfUrl ? (
                            <iframe
                                className="clip-player-frame"
                                src={`${activeEBook.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                title={activeEBook.title}
                                allowFullScreen
                            />
                        ) : (
                            <div className="clip-player-fallback" style={{ color: "#508db9" }}>ไม่พบไฟล์ PDF</div>
                        )}
                    </div>

                    <div className="clip-player-caption" style={{ color: "#2c5d80" }}>
                        {activeEBook ? `กำลังอ่าน: ${activeEBook.title}` : "กรุณาตรวจสอบลิงก์"}
                    </div>
                </div>
            }
        />
    );
}
