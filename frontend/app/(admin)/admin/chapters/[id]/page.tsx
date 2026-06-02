"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import {
  useGetAdminChapterQuery,
  useUpdateChapterMutation,
  useGetAdminScenesQuery,
  useCreateSceneMutation,
  useUpdateSceneMutation,
  useDeleteSceneMutation,
  type CreateSceneRequest,
  type UpdateSceneRequest,
} from "@/store/adminApi";
import type { ChapterScene } from "@/types/chapters";
import styles from "@/components/Admin.module.css";

const EMPTY_SCENE: CreateSceneRequest = {
  idx: 0,
  speakerName: "",
  speakerImageUrl: "",
  text: "",
};

export default function AdminChapterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = Number(params.id);

  const { data: chapter, isLoading: chapterLoading } = useGetAdminChapterQuery(chapterId);
  const { data: scenes, isLoading: scenesLoading } = useGetAdminScenesQuery(chapterId);
  const [updateChapter] = useUpdateChapterMutation();
  const [createScene] = useCreateSceneMutation();
  const [updateScene] = useUpdateSceneMutation();
  const [deleteScene] = useDeleteSceneMutation();

  const [chapterForm, setChapterForm] = useState({
    title: "",
    introTitle: "",
    lockState: "unlocked" as "unlocked" | "locked",
    backgroundImageUrl: "",
  });

  useEffect(() => {
    if (chapter) {
      setChapterForm({
        title: chapter.title,
        introTitle: chapter.introTitle,
        lockState: chapter.lockState,
        backgroundImageUrl: chapter.backgroundImageUrl ?? "",
      });
    }
  }, [chapter]);

  const [showSceneForm, setShowSceneForm] = useState(false);
  const [editSceneId, setEditSceneId] = useState<string | null>(null);
  const [sceneForm, setSceneForm] = useState<CreateSceneRequest>(EMPTY_SCENE);

  async function handleSaveChapter(e: React.FormEvent) {
    e.preventDefault();
    await updateChapter({ id: chapterId, body: chapterForm });
  }

  function openCreateScene() {
    setEditSceneId(null);
    setSceneForm(EMPTY_SCENE);
    setShowSceneForm(true);
  }

  function openEditScene(scene: ChapterScene) {
    setEditSceneId(scene.id);
    setSceneForm({
      idx: scene.index,
      speakerName: scene.speakerName,
      speakerImageUrl: scene.speakerImageUrl ?? "",
      text: scene.text,
    });
    setShowSceneForm(true);
  }

  function closeSceneForm() {
    setShowSceneForm(false);
    setEditSceneId(null);
    setSceneForm(EMPTY_SCENE);
  }

  async function handleSubmitScene(e: React.FormEvent) {
    e.preventDefault();
    const body: CreateSceneRequest = {
      ...sceneForm,
      speakerImageUrl: sceneForm.speakerImageUrl || undefined,
    };
    if (editSceneId !== null) {
      await updateScene({ sceneId: editSceneId, body: body as UpdateSceneRequest });
    } else {
      await createScene({ chapterId, body });
    }
    closeSceneForm();
  }

  async function handleDeleteScene(sceneId: string) {
    if (!window.confirm("ลบ scene นี้หรือไม่?")) return;
    await deleteScene(sceneId);
  }

  if (chapterLoading) {
    return (
      <div className={styles.adminLayout}>
        <AdminSidebar />
        <div className={styles.adminMainWrapper}>
          <main className={styles.adminMain}><div className={styles.adminSpinner} /></main>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <div className={styles.adminMainWrapper}>
        <main className={styles.adminMain}>

          <div className={styles.adminPageHeader}>
            <div className={styles.adminHeaderGroup}>
              <button className={`${styles.adminBtn} ${styles.adminBtnSecondary}`} onClick={() => router.push("/admin/chapters")}>
                ← Chapters
              </button>
              <h1 className={styles.adminPageTitle}>{chapter?.title ?? "Chapter"}</h1>
            </div>
          </div>

          {/* Chapter info form */}
          <div className={styles.adminFormCard}>
            <h2>Chapter Info</h2>
            <form onSubmit={handleSaveChapter}>
              <div className={styles.adminFormGrid}>
                <div className={styles.adminFormField}>
                  <label className={styles.adminLabel}>Title</label>
                  <input
                    className={styles.adminInput}
                    value={chapterForm.title}
                    onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.adminFormField}>
                  <label className={styles.adminLabel}>Intro Title</label>
                  <input
                    className={styles.adminInput}
                    value={chapterForm.introTitle}
                    onChange={(e) => setChapterForm({ ...chapterForm, introTitle: e.target.value })}
                  />
                </div>
                <div className={styles.adminFormField}>
                  <label className={styles.adminLabel}>Lock State</label>
                  <select
                    className={styles.adminSelect}
                    value={chapterForm.lockState}
                    onChange={(e) => setChapterForm({ ...chapterForm, lockState: e.target.value as "unlocked" | "locked" })}
                  >
                    <option value="unlocked">unlocked</option>
                    <option value="locked">locked</option>
                  </select>
                </div>
                <div className={styles.adminFormField}>
                  <label className={styles.adminLabel}>Background Image URL (optional)</label>
                  <input
                    className={styles.adminInput}
                    value={chapterForm.backgroundImageUrl}
                    onChange={(e) => setChapterForm({ ...chapterForm, backgroundImageUrl: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.adminFormActions}>
                <button type="submit" className={`${styles.adminBtn} ${styles.adminBtnPrimary}`}>บันทึก</button>
              </div>
            </form>
          </div>

          {/* Scene add/edit form */}
          {showSceneForm && (
            <div className={styles.adminFormCard}>
              <h2>{editSceneId !== null ? "แก้ไข Scene" : "เพิ่ม Scene ใหม่"}</h2>
              <form onSubmit={handleSubmitScene}>
                <div className={styles.adminFormGrid}>
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>Index (idx)</label>
                    <input
                      className={styles.adminInput}
                      type="number"
                      value={sceneForm.idx}
                      onChange={(e) => setSceneForm({ ...sceneForm, idx: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>Speaker Name</label>
                    <input
                      className={styles.adminInput}
                      value={sceneForm.speakerName}
                      onChange={(e) => setSceneForm({ ...sceneForm, speakerName: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>Speaker Image URL (optional)</label>
                    <input
                      className={styles.adminInput}
                      value={sceneForm.speakerImageUrl ?? ""}
                      onChange={(e) => setSceneForm({ ...sceneForm, speakerImageUrl: e.target.value })}
                    />
                  </div>
                  <div className={`${styles.adminFormField} ${styles.full}`}>
                    <label className={styles.adminLabel}>Text</label>
                    <textarea
                      className={styles.adminTextarea}
                      rows={4}
                      value={sceneForm.text}
                      onChange={(e) => setSceneForm({ ...sceneForm, text: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className={styles.adminFormActions}>
                  <button type="button" className={`${styles.adminBtn} ${styles.adminBtnSecondary}`} onClick={closeSceneForm}>ยกเลิก</button>
                  <button type="submit" className={`${styles.adminBtn} ${styles.adminBtnPrimary}`}>
                    {editSceneId !== null ? "บันทึก" : "เพิ่ม"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Scenes table */}
          <div className={`${styles.adminPageHeader} ${styles.adminSectionHeader}`}>
            <h2 className={styles.adminPageTitle} style={{ fontSize: "1.2rem" }}>Scenes</h2>
            <button className={`${styles.adminBtn} ${styles.adminBtnPrimary}`} onClick={openCreateScene}>+ Add Scene</button>
          </div>

          {scenesLoading ? (
            <div className={styles.adminSpinner} />
          ) : (
            <div className={styles.adminTableWrap}>
              <table className={styles.adminTable}>
                <thead>
                  <tr>
                    <th>idx</th>
                    <th>Speaker Name</th>
                    <th>Speaker Image URL</th>
                    <th>Text</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(scenes ?? []).map((scene) => (
                    <tr key={scene.id}>
                      <td>{scene.index}</td>
                      <td>{scene.speakerName}</td>
                      <td className={styles.adminTruncated}>
                        {scene.speakerImageUrl ?? "—"}
                      </td>
                      <td className={styles.adminTruncated} style={{ maxWidth: "300px" }}>
                        {scene.text}
                      </td>
                      <td>
                        <div className={styles.adminTableActions}>
                          <button className={`${styles.adminBtn} ${styles.adminBtnSecondary}`} onClick={() => openEditScene(scene)}>Edit</button>
                          <button className={`${styles.adminBtn} ${styles.adminBtnDanger}`} onClick={() => handleDeleteScene(scene.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
