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
      <div className="admin-layout">
        <AdminSidebar hideTopbar />
        <div className="admin-main-wrapper">
          <main className="admin-main"><div className="chapter-spinner" /></main>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <AdminSidebar hideTopbar />
      <div className="admin-main-wrapper">
        <main className="admin-main">

          <div className="admin-page-header">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button className="admin-btn admin-btn-secondary" onClick={() => router.push("/admin/chapters")}>
                ← Chapters
              </button>
              <h1 className="admin-page-title">{chapter?.title ?? "Chapter"}</h1>
            </div>
          </div>

          {/* Chapter info form */}
          <div className="admin-form-card">
            <h2>Chapter Info</h2>
            <form onSubmit={handleSaveChapter}>
              <div className="admin-form-grid">
                <div className="admin-form-field">
                  <label className="admin-label">Title</label>
                  <input
                    className="admin-input"
                    value={chapterForm.title}
                    onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Intro Title</label>
                  <input
                    className="admin-input"
                    value={chapterForm.introTitle}
                    onChange={(e) => setChapterForm({ ...chapterForm, introTitle: e.target.value })}
                  />
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Lock State</label>
                  <select
                    className="admin-select"
                    value={chapterForm.lockState}
                    onChange={(e) => setChapterForm({ ...chapterForm, lockState: e.target.value as "unlocked" | "locked" })}
                  >
                    <option value="unlocked">unlocked</option>
                    <option value="locked">locked</option>
                  </select>
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Background Image URL (optional)</label>
                  <input
                    className="admin-input"
                    value={chapterForm.backgroundImageUrl}
                    onChange={(e) => setChapterForm({ ...chapterForm, backgroundImageUrl: e.target.value })}
                  />
                </div>
              </div>
              <div className="admin-form-actions">
                <button type="submit" className="admin-btn admin-btn-primary">บันทึก</button>
              </div>
            </form>
          </div>

          {/* Scene add/edit form */}
          {showSceneForm && (
            <div className="admin-form-card">
              <h2>{editSceneId !== null ? "แก้ไข Scene" : "เพิ่ม Scene ใหม่"}</h2>
              <form onSubmit={handleSubmitScene}>
                <div className="admin-form-grid">
                  <div className="admin-form-field">
                    <label className="admin-label">Index (idx)</label>
                    <input
                      className="admin-input"
                      type="number"
                      value={sceneForm.idx}
                      onChange={(e) => setSceneForm({ ...sceneForm, idx: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-label">Speaker Name</label>
                    <input
                      className="admin-input"
                      value={sceneForm.speakerName}
                      onChange={(e) => setSceneForm({ ...sceneForm, speakerName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-label">Speaker Image URL (optional)</label>
                    <input
                      className="admin-input"
                      value={sceneForm.speakerImageUrl ?? ""}
                      onChange={(e) => setSceneForm({ ...sceneForm, speakerImageUrl: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="admin-label">Text</label>
                    <textarea
                      className="admin-input"
                      rows={4}
                      value={sceneForm.text}
                      onChange={(e) => setSceneForm({ ...sceneForm, text: e.target.value })}
                      required
                      style={{ resize: "vertical" }}
                    />
                  </div>
                </div>
                <div className="admin-form-actions">
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={closeSceneForm}>ยกเลิก</button>
                  <button type="submit" className="admin-btn admin-btn-primary">
                    {editSceneId !== null ? "บันทึก" : "เพิ่ม"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Scenes table */}
          <div className="admin-page-header" style={{ marginTop: "2rem" }}>
            <h2 className="admin-page-title" style={{ fontSize: "1.2rem" }}>Scenes</h2>
            <button className="admin-btn admin-btn-primary" onClick={openCreateScene}>+ Add Scene</button>
          </div>

          {scenesLoading ? (
            <div className="chapter-spinner" />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
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
                      <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {scene.speakerImageUrl ?? "—"}
                      </td>
                      <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {scene.text}
                      </td>
                      <td>
                        <div className="admin-table-actions">
                          <button className="admin-btn admin-btn-secondary" onClick={() => openEditScene(scene)}>Edit</button>
                          <button className="admin-btn admin-btn-danger" onClick={() => handleDeleteScene(scene.id)}>Delete</button>
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
