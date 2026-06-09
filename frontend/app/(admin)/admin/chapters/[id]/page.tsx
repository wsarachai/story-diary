"use client";

import { useState, useEffect } from "react";
import AdminDragHandle from "@/components/AdminDragHandle";
import { useParams, useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import AdminErrorBanner from "@/components/AdminErrorBanner";
import {
  useGetAdminChapterQuery,
  useUpdateChapterMutation,
  useGetAdminScenesQuery,
  useCreateSceneMutation,
  useUpdateSceneMutation,
  useDeleteSceneMutation,
  useReorderChapterScenesMutation,
  type CreateSceneRequest,
  type UpdateSceneRequest,
} from "@/store/adminApi";
import type { ChapterScene } from "@/types/chapters";
import styles from "@/components/Admin.module.css";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SPEAKER_IMAGES = [
  { value: "", label: "None" },
  { value: "/images/chapter-speaker-narrator-transparent.png", label: "Narrator" },
  { value: "/images/chapter-speaker-girl-transparent.png", label: "Girl (clear)" },
  { value: "/images/chapter-speaker-girl-01.png", label: "Girl 1" },
  { value: "/images/chapter-speaker-girl-02.png", label: "Girl 2" },
  { value: "/images/chapter-speaker-girl-03.png", label: "Girl 3" },
  { value: "/images/chapter-speaker-girl-04.png", label: "Girl 4" },
  { value: "/images/chapter-speaker-girl-05.png", label: "Girl 5" },
  { value: "/images/chapter-speaker-man-01.png", label: "Man 1" },
  { value: "/images/chapter-speaker-man-02.png", label: "Man 2" },
  { value: "/images/chapter-speaker-man-03.png", label: "Man 3" },
];

const EMPTY_SCENE: CreateSceneRequest = {
  idx: 0,
  speakerName: "",
  speakerImageUrl: "",
  text: "",
};

function SortableSceneRow({
  scene,
  onEdit,
  onDelete,
}: {
  scene: ChapterScene;
  onEdit: (scene: ChapterScene) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.95 : 1,
    background: isDragging ? "#21262d" : undefined,
    boxShadow: isDragging ? "0 2px 10px rgba(0,0,0,0.6)" : undefined,
  };

  return (
    <tr ref={setNodeRef} style={style}>
      <td>
        <span {...attributes} {...listeners} style={{ display: "inline-flex", alignItems: "center", padding: "0 4px" }}>
          <AdminDragHandle />
        </span>
      </td>
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
          <button className={`${styles.adminBtn} ${styles.adminBtnSecondary}`} onClick={() => onEdit(scene)}>Edit</button>
          <button className={`${styles.adminBtn} ${styles.adminBtnDanger}`} onClick={() => onDelete(scene.id)}>Delete</button>
        </div>
      </td>
    </tr>
  );
}

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
  const [reorderChapterScenes] = useReorderChapterScenesMutation();
  const [reorderError, setReorderError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentScenes = scenes ?? [];
    const oldIndex = currentScenes.findIndex((s) => s.id === active.id);
    const newIndex = currentScenes.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(currentScenes.map((s) => s.id), oldIndex, newIndex);

    try {
      await reorderChapterScenes({ chapterId, ids: newOrder }).unwrap();
    } catch {
      setReorderError("บันทึกลำดับฉากไม่สำเร็จ ลองอีกครั้ง");
    }
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

          {reorderError && (
            <AdminErrorBanner message={reorderError} onDismiss={() => setReorderError(null)} />
          )}

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
                  <div className={`${styles.adminFormField} ${styles.full}`}>
                    <label className={styles.adminLabel}>Speaker Image (optional)</label>
                    <div className={styles.adminImagePicker}>
                      {SPEAKER_IMAGES.map((img) => {
                        const selected = (sceneForm.speakerImageUrl ?? "") === img.value;
                        return (
                          <button
                            key={img.value || "__none__"}
                            type="button"
                            title={img.label}
                            onClick={() => setSceneForm({ ...sceneForm, speakerImageUrl: img.value })}
                            className={`${styles.adminImageTile} ${selected ? styles.adminImageTileSelected : ""}`}
                          >
                            {img.value ? (
                              <img src={img.value} alt={img.label} className={styles.adminImageTileImg} />
                            ) : (
                              <span className={styles.adminImageTileNone}>—</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "2rem" }} />
                      <th>idx</th>
                      <th>Speaker Name</th>
                      <th>Speaker Image URL</th>
                      <th>Text</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <SortableContext items={(scenes ?? []).map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <tbody>
                      {(scenes ?? []).map((scene) => (
                        <SortableSceneRow
                          key={scene.id}
                          scene={scene}
                          onEdit={openEditScene}
                          onDelete={handleDeleteScene}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
