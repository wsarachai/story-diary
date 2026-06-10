"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetEBooksQuery } from "@/store/ebookApi";
import PageSpinner from "@/components/PageSpinner";
import styles from "../EBookViewer.module.css";

export default function EBookViewerPage() {
    const { data: collection, isLoading } = useGetEBooksQuery();
    const params = useParams<{ id: string }>();
    const ebookId = params?.id ?? "";

    const activeEBook = useMemo(() => {
        return collection?.chapters.find(c => c.id === ebookId);
    }, [collection, ebookId]);

    const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") ?? "") : "";

    if (isLoading) {
        return (
            <BookShellLayout tight rail={<IconRail />} left={<div />} right={<div />} mergedOnly
                merged={<PageSpinner label="กำลังโหลด E-book…" />}
            />
        );
    }

    if (!activeEBook?.pdfUrl) {
        return (
            <BookShellLayout tight rail={<IconRail />} left={<div />} right={<div />} mergedOnly
                merged={
                    <div className={styles.clipPlayerPage}>
                        <div className={styles.clipPlayerPageHeader}>
                            <Link href="/e-books" className={styles.clipPlayerBack} aria-label="กลับหน้า E-book">
                                กลับ
                            </Link>
                            <h1 className={styles.clipPlayerTitle}>{activeEBook?.title ?? "ไม่พบ E-book"}</h1>
                        </div>
                        <div className={styles.clipPlayerFallback}>
                            <p>ไม่พบไฟล์ PDF</p>
                        </div>
                    </div>
                }
            />
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
                        <h1 className={styles.clipPlayerTitle}>{activeEBook.title}</h1>
                    </div>

                    <div className={styles.clipPlayerFrameWrap}>
                        <object
                            className={styles.clipPlayerFrame}
                            data={`/api/pdf-proxy?url=${encodeURIComponent(activeEBook.pdfUrl)}&token=${encodeURIComponent(token)}#toolbar=0&navpanes=0&scrollbar=0`}
                            type="application/pdf"
                        >
                            <div className={styles.clipPlayerFallback}>
                                <p>ไม่สามารถแสดง PDF ได้</p>
                            </div>
                        </object>
                    </div>

                    <div className={styles.clipPlayerCaption}>
                        {`กำลังอ่าน: ${activeEBook.title}`}
                    </div>
                </div>
            }
        />
    );
}
