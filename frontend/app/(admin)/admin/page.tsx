"use client";

import AdminSidebar from "@/components/AdminSidebar";
import { useGetAdminChaptersQuery } from "@/store/adminApi";
import { useGetAdminEBooksQuery } from "@/store/adminApi";
import { useGetAdminQuestionsQuery } from "@/store/adminApi";
import styles from "@/components/Admin.module.css";

export default function AdminDashboardPage() {
  const { data: chapters, isLoading: chaptersLoading } = useGetAdminChaptersQuery();
  const { data: ebooks, isLoading: ebooksLoading } = useGetAdminEBooksQuery();
  const { data: questions, isLoading: questionsLoading } = useGetAdminQuestionsQuery();

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <div className={styles.adminMainWrapper}>
        <main className={styles.adminMain}>
          <div className={styles.adminPageHeader}>
            <h1 className={styles.adminPageTitle}>Dashboard</h1>
          </div>
          <div className={styles.adminStatGrid}>
            <div className={styles.adminStatCard}>
              <h3>Chapters</h3>
              <div className={styles.value}>
                {chaptersLoading ? "—" : (chapters?.length ?? 0)}
              </div>
            </div>
            <div className={styles.adminStatCard}>
              <h3>E-Books</h3>
              <div className={styles.value}>
                {ebooksLoading ? "—" : (ebooks?.length ?? 0)}
              </div>
            </div>
            <div className={styles.adminStatCard}>
              <h3>Quiz Questions</h3>
              <div className={styles.value}>
                {questionsLoading ? "—" : (questions ? questions.male.length + questions.female.length : 0)}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
