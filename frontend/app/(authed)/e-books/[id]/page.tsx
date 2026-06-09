"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetEBooksQuery } from "@/store/ebookApi";
import PageSpinner from "@/components/PageSpinner";
import type { EBookChapter } from "@/types/ebook";
import styles from "../EBookViewer.module.css";

export default function EBookViewerPage() {
    const { data: collection, isLoading } = useGetEBooksQuery();
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
                <div className={styles.clipPlayerPage}>
                    <div className={styles.clipPlayerPageHeader}>
                        <Link href="/e-books" className={styles.clipPlayerBack} aria-label="กลับหน้า E-book">
                            กลับ
                        </Link>
                        <h1 className={styles.clipPlayerTitle}>{activeEBook?.title ?? "ไม่พบ E-book"}</h1>
                    </div>

                    <div className={styles.clipPlayerFrameWrap}>
                        {isLoading ? (
                            <PageSpinner label="กำลังโหลด E-book…" />
                        ) : activeEBook?.pdfUrl ? (
                            <object
                                className={styles.clipPlayerFrame}
                                data={`${activeEBook.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                type="application/pdf"
                            >
                                <div className={styles.clipPlayerFallback}>
                                    <p>ไม่สามารถแสดง PDF ได้</p>
                                    <a
                                        href={activeEBook.pdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.clipPlayerFallbackLink}
                                    >
                                        เปิด PDF ในแท็บใหม่
                                    </a>
                                </div>
                            </object>
                        ) : (
                            <div className={styles.clipPlayerFallback}>ไม่พบไฟล์ PDF</div>
                        ) }
                    </div>

                    <div className={styles.clipPlayerCaption}>
                        {activeEBook ? `กำลังอ่าน: ${activeEBook.title}` : "กรุณาตรวจสอบลิงก์"}
                    </div>
                </div>
            }
        />
    );
}
