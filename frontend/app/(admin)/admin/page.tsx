"use client";

import AdminSidebar from "@/components/AdminSidebar";
import { useGetAdminChaptersQuery } from "@/store/adminApi";
import { useGetAdminEBooksQuery } from "@/store/adminApi";
import { useGetAdminQuestionsQuery } from "@/store/adminApi";

export default function AdminDashboardPage() {
  const { data: chapters, isLoading: chaptersLoading } = useGetAdminChaptersQuery();
  const { data: ebooks, isLoading: ebooksLoading } = useGetAdminEBooksQuery();
  const { data: questions, isLoading: questionsLoading } = useGetAdminQuestionsQuery();

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main-wrapper">
      <main className="admin-main">
        <div className="admin-page-header">
          <h1 className="admin-page-title">Dashboard</h1>
        </div>
        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <h3>Chapters</h3>
            <div className="value">
              {chaptersLoading ? "—" : (chapters?.length ?? 0)}
            </div>
          </div>
          <div className="admin-stat-card">
            <h3>E-Books</h3>
            <div className="value">
              {ebooksLoading ? "—" : (ebooks?.length ?? 0)}
            </div>
          </div>
          <div className="admin-stat-card">
            <h3>Quiz Questions</h3>
            <div className="value">
              {questionsLoading ? "—" : (questions?.length ?? 0)}
            </div>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
