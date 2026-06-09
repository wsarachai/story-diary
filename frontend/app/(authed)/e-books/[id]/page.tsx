"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetEBooksQuery } from "@/store/ebookApi";
import PageSpinner from "@/components/PageSpinner";
import type { EBookChapter } from "@/types/ebook";
import styles from "../EBookViewer.module.css";

type PdfState = "checking" | "ready" | "error";

export default function EBookViewerPage() {
    const { data: collection, isLoading } = useGetEBooksQuery();
    const params = useParams<{ id: string }>();
    const ebookId = params?.id ?? "";

    const activeEBook = useMemo(() => {
        return collection?.chapters.find(c => c.id === ebookId);
    }, [collection, ebookId]);

    const [pdfState, setPdfState] = useState<PdfState>("checking");

    useEffect(() => {
        const url = activeEBook?.pdfUrl;
        if (!url) { setPdfState("error"); return; }

        setPdfState("checking");
        let cancelled = false;

        fetch(url, { method: "HEAD" })
            .then((res) => {
                if (cancelled) return;
                const ct = res.headers.get("content-type") ?? "";
                // Accept if response is ok AND content-type looks like a PDF
                setPdfState(res.ok && ct.includes("pdf") ? "ready" : "error");
            })
            .catch(() => {
                // CORS or network error — optimistically render; <object> will show
                // its own fallback if the URL is truly unreachable
                if (!cancelled) setPdfState("ready");
            });

        return () => { cancelled = true; };
    }, [activeEBook?.pdfUrl]);

    function PdfFallback() {
        return (
            <div className={styles.clipPlayerFallback}>
                <p>ไม่สามารถแสดง PDF ได้</p>
            </div>
        );
    }

    function renderContent() {
        if (isLoading) return <PageSpinner label="กำลังโหลด E-book…" />;
        if (!activeEBook?.pdfUrl) return <div className={styles.clipPlayerFallback}>ไม่พบไฟล์ PDF</div>;
        if (pdfState === "checking") return <PageSpinner label="กำลังตรวจสอบ PDF…" />;
        if (pdfState === "error") return <PdfFallback />;
        return (
            <object
                className={styles.clipPlayerFrame}
                data={`${activeEBook.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                type="application/pdf"
            >
                <PdfFallback />
            </object>
        );
    }

    return (
        <BookShellLayout
            tight
            rail={<IconRail />}
            left={<div />}
            right={<div />}
            mergedOnly
            merged={
                <div className={styles.clipPlayerPage}>
                    <div className={styles.clipPlayerPageHeader}>
                        <Link href="/e-books" className={styles.clipPlayerBack} aria-label="กลับหน้า E-book">
                            กลับ
                        </Link>
                        <h1 className={styles.clipPlayerTitle}>{activeEBook?.title ?? "ไม่พบ E-book"}</h1>
                    </div>

                    <div className={styles.clipPlayerFrameWrap}>
                        {renderContent()}
                    </div>

                    <div className={styles.clipPlayerCaption}>
                        {activeEBook ? `กำลังอ่าน: ${activeEBook.title}` : "กรุณาตรวจสอบลิงก์"}
                    </div>
                </div>
            }
        />
    );
}
