"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ImageIcon, Plus, ScrollText, Trash2, UserRound, X } from "lucide-react";
import AdminDragHandle from "@/components/AdminDragHandle";
import { useParams, useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import AdminErrorBanner from "@/components/AdminErrorBanner";
import AdminBackgroundPicker from "@/components/AdminBackgroundPicker";
import {
  useGetAdminChapterQuery,
  useUpdateChapterMutation,
  useGetAdminScenesQuery,
  useCreateSceneMutation,
  useUpdateSceneMutation,
  useDeleteSceneMutation,
  useReorderChapterScenesMutation,
  type CreateSceneRequest,
} from "@/store/adminApi";
import type { ChapterScene, SceneType } from "@/types/chapters";
import {
  CHARACTER_IMAGE_GROUPS,
  CHARACTER_PRESETS,
  MAIN_ACTOR_SPEAKER_NAME,
  MAIN_ACTOR_IMAGE_URLS,
  findCharacterPreset,
  guessCharacterKey,
  mainActorImageUrl,
} from "@/lib/character";
import { findChapterBackground } from "@/lib/backgrounds";
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

const EMPTY_SCENE: CreateSceneRequest = {
  type: "actor",
  actorKind: "main",
  idx: 0,
  speakerName: MAIN_ACTOR_SPEAKER_NAME,
  speakerImageUrl: "",
  backgroundImageUrl: "",
  text: "",
};

/** Short label + badge colour for a scene's type. */
function sceneTypeBadge(scene: ChapterScene): { label: string; className: string } {
  if (scene.type === "system") return { label: "System", className: styles.adminBadgeGray };
  if (scene.actorKind === "main") return { label: "ผู้กล้า", className: styles.sceneBadgeBlue };
  return { label: "ตัวละคร", className: styles.adminBadgeGreen };
}

/** Thumbnail art for a scene card (main-actor scenes resolve per reader gender). */
function sceneAvatarUrl(scene: ChapterScene): string | null {
  if (scene.type === "system") return null;
  if (scene.actorKind === "main") return mainActorImageUrl(undefined);
  return scene.speakerImageUrl || null;
}

/** Form state a scene loads into the editor with. */
function sceneToForm(scene: ChapterScene): CreateSceneRequest {
  return {
    type: scene.type ?? "actor",
    actorKind: scene.actorKind ?? "other",
    idx: scene.index,
    speakerName: scene.speakerName,
    speakerImageUrl: scene.speakerImageUrl ?? "",
    backgroundImageUrl: scene.backgroundImageUrl ?? "",
    text: scene.text,
  };
}

function SortableSceneCard({
  scene,
  selected,
  onSelect,
  onDelete,
}: {
  scene: ChapterScene;
  selected: boolean;
  onSelect: (scene: ChapterScene) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.95 : 1,
    boxShadow: isDragging ? "0 4px 14px rgba(0,0,0,0.6)" : undefined,
    zIndex: isDragging ? 1 : undefined,
    position: "relative",
  };
  const badge = sceneTypeBadge(scene);
  const avatar = sceneAvatarUrl(scene);

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-scene-id={scene.id}
      role="button"
      tabIndex={0}
      aria-current={selected ? "true" : undefined}
      aria-label={`Scene ${scene.index}: ${scene.text.slice(0, 40)}`}
      className={`${styles.sceneCard} ${selected ? styles.sceneCardSelected : ""}`}
      onClick={() => onSelect(scene)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(scene);
        }
      }}
    >
      <span
        {...attributes}
        {...listeners}
        className={styles.sceneDragHandle}
        title="ลากเพื่อเรียงลำดับ"
        onClick={(e) => e.stopPropagation()}
      >
        <AdminDragHandle />
      </span>
      <span className={styles.sceneIdx}>#{scene.index}</span>
      <span className={styles.sceneAvatar}>
        {avatar ? (
          <Image src={avatar} alt="" fill sizes="44px" style={{ objectFit: "cover", objectPosition: "top" }} />
        ) : scene.type === "system" ? (
          <ScrollText size={20} aria-hidden="true" />
        ) : (
          <UserRound size={20} aria-hidden="true" />
        )}
      </span>
      <span className={styles.sceneCardBody}>
        <span className={styles.sceneCardMeta}>
          <span className={`${styles.adminBadge} ${badge.className}`}>{badge.label}</span>
          {scene.type !== "system" && scene.actorKind !== "main" && scene.speakerName && (
            <span className={styles.sceneCardSpeaker}>{scene.speakerName}</span>
          )}
          {scene.backgroundImageUrl && (
            <span
              className={styles.sceneCardBgBadge}
              title={`พื้นหลังเฉพาะ scene: ${findChapterBackground(scene.backgroundImageUrl)?.label ?? scene.backgroundImageUrl}`}
            >
              <ImageIcon size={13} aria-hidden="true" />
              {findChapterBackground(scene.backgroundImageUrl)?.label ?? "พื้นหลัง"}
            </span>
          )}
        </span>
        <span className={styles.sceneCardText}>{scene.text || "—"}</span>
      </span>
      <button
        type="button"
        className={`${styles.sceneIconBtn} ${styles.sceneIconBtnDanger}`}
        title="ลบ scene"
        aria-label={`ลบ scene ${scene.index}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(scene.id);
        }}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </li>
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const [chapterForm, setChapterForm] = useState({
    title: "",
    introTitle: "",
    lockState: "unlocked" as "unlocked" | "locked",
    backgroundImageUrl: "",
  });
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [chapterSaved, setChapterSaved] = useState(false);

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
  /** Snapshot the editor opened with — compared against sceneForm for unsaved changes. */
  const [sceneFormBaseline, setSceneFormBaseline] = useState<CreateSceneRequest>(EMPTY_SCENE);
  const [characterKey, setCharacterKey] = useState("main");
  const [sceneSaving, setSceneSaving] = useState(false);
  const [sceneSaved, setSceneSaved] = useState(false);
  const [showSceneBgPicker, setShowSceneBgPicker] = useState(false);
  const sceneFormRef = useRef<HTMLFormElement>(null);

  const sceneList = scenes ?? [];
  const isSceneDirty = JSON.stringify(sceneForm) !== JSON.stringify(sceneFormBaseline);
  const editIndex = editSceneId === null ? -1 : sceneList.findIndex((s) => s.id === editSceneId);

  /** Apply a character preset: fills actor kind, speaker name and first art. */
  function applyCharacterKey(key: string) {
    setCharacterKey(key);
    const preset = findCharacterPreset(key);
    if (!preset) return;
    if (preset.kind === "main") {
      setSceneForm((f) => ({
        ...f,
        type: "actor",
        actorKind: "main",
        speakerName: MAIN_ACTOR_SPEAKER_NAME,
        speakerImageUrl: "",
      }));
      return;
    }
    setSceneForm((f) => ({
      ...f,
      type: "actor",
      actorKind: "other",
      speakerName: preset.kind === "custom" ? "" : preset.label,
      speakerImageUrl: preset.images[0] ?? "",
    }));
  }

  /** Image groups offered for the currently selected character. */
  function pickerGroups(): { label: string; images: string[] }[] {
    const preset = findCharacterPreset(characterKey);
    if (preset && preset.kind === "preset" && preset.images.length > 0) {
      return [{ label: preset.label, images: preset.images }];
    }
    return CHARACTER_IMAGE_GROUPS;
  }

  async function handleSaveChapter(e: React.FormEvent) {
    e.preventDefault();
    await updateChapter({ id: chapterId, body: chapterForm });
    setChapterSaved(true);
  }

  /** Ask before throwing away unsaved scene edits. */
  const confirmDiscard = useCallback(
    () => !isSceneDirty || window.confirm("มีการแก้ไขที่ยังไม่บันทึก ต้องการทิ้งการแก้ไขหรือไม่?"),
    [isSceneDirty],
  );

  function loadScene(scene: ChapterScene) {
    const form = sceneToForm(scene);
    setEditSceneId(scene.id);
    setSceneForm(form);
    setSceneFormBaseline(form);
    setCharacterKey(
      scene.type === "actor" && scene.actorKind === "main"
        ? "main"
        : guessCharacterKey(scene.speakerName, scene.speakerImageUrl),
    );
    setSceneSaved(false);
    setShowSceneBgPicker(false);
    setShowSceneForm(true);
  }

  function openCreateScene() {
    if (!confirmDiscard()) return;
    // New scenes default to the end of the chapter.
    const form = { ...EMPTY_SCENE, idx: sceneList.length };
    setEditSceneId(null);
    setSceneForm(form);
    setSceneFormBaseline(form);
    setCharacterKey("main");
    setSceneSaved(false);
    setShowSceneBgPicker(false);
    setShowSceneForm(true);
  }

  function selectScene(scene: ChapterScene) {
    if (scene.id === editSceneId && showSceneForm) return;
    if (!confirmDiscard()) return;
    loadScene(scene);
  }

  function stepScene(delta: -1 | 1) {
    const target = sceneList[editIndex + delta];
    if (!target || !confirmDiscard()) return;
    loadScene(target);
    document
      .querySelector(`[data-scene-id="${window.CSS.escape(target.id)}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  const closeSceneForm = useCallback(() => {
    if (!confirmDiscard()) return;
    setShowSceneForm(false);
    setEditSceneId(null);
    setSceneForm(EMPTY_SCENE);
    setSceneFormBaseline(EMPTY_SCENE);
    setCharacterKey("main");
    setSceneSaved(false);
    setShowSceneBgPicker(false);
  }, [confirmDiscard]);

  async function handleSubmitScene(e: React.FormEvent) {
    e.preventDefault();
    if (sceneSaving) return;
    if (sceneForm.type === "actor" && sceneForm.actorKind === "other") {
      if (!sceneForm.speakerName?.trim() || !sceneForm.speakerImageUrl) return;
    }
    const body: CreateSceneRequest = {
      ...sceneForm,
      speakerName: sceneForm.speakerName ?? "",
      speakerImageUrl: sceneForm.speakerImageUrl || undefined,
      backgroundImageUrl: sceneForm.backgroundImageUrl || undefined,
    };
    setSceneSaving(true);
    try {
      if (editSceneId !== null) {
        await updateScene({ sceneId: editSceneId, chapterId, body }).unwrap();
      } else {
        const created = await createScene({ chapterId, body }).unwrap();
        // Keep editing the new scene in place and bring its card into view.
        if (created?.id) {
          setEditSceneId(created.id);
          requestAnimationFrame(() =>
            document
              .querySelector(`[data-scene-id="${window.CSS.escape(created.id)}"]`)
              ?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
          );
        }
      }
      setSceneFormBaseline(sceneForm);
      setSceneSaved(true);
    } finally {
      setSceneSaving(false);
    }
  }

  async function handleDeleteScene(sceneId: string) {
    if (!window.confirm("ลบ scene นี้หรือไม่?")) return;
    await deleteScene({ sceneId, chapterId });
    if (sceneId === editSceneId) {
      setShowSceneForm(false);
      setEditSceneId(null);
      setSceneForm(EMPTY_SCENE);
      setSceneFormBaseline(EMPTY_SCENE);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sceneList.findIndex((s) => s.id === active.id);
    const newIndex = sceneList.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(sceneList.map((s) => s.id), oldIndex, newIndex);

    try {
      await reorderChapterScenes({ chapterId, ids: newOrder }).unwrap();
    } catch {
      setReorderError("บันทึกลำดับฉากไม่สำเร็จ ลองอีกครั้ง");
    }
  }

  // Esc closes the editor; Ctrl/⌘+Enter saves it.
  useEffect(() => {
    if (!showSceneForm) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSceneForm();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        sceneFormRef.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSceneForm, closeSceneForm]);

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

  const background = findChapterBackground(chapter?.backgroundImageUrl);
  const backgroundUrl = chapter?.backgroundImageUrl || null;

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

          {/* Chapter info — compact summary, expands to the full form on demand */}
          <div className={styles.chapterSummary}>
            <div className={styles.chapterSummaryThumb}>
              {backgroundUrl ? (
                <Image src={backgroundUrl} alt={background?.label ?? "ภาพพื้นหลัง"} fill sizes="112px" style={{ objectFit: "cover" }} />
              ) : (
                <span>ไม่มีพื้นหลัง</span>
              )}
            </div>
            <div className={styles.chapterSummaryText}>
              <div className={styles.chapterSummaryTitle}>
                {chapter?.title}{" "}
                <span className={`${styles.adminBadge} ${chapter?.lockState === "locked" ? styles.adminBadgeYellow : styles.adminBadgeGreen}`}>
                  {chapter?.lockState}
                </span>
              </div>
              <div className={styles.chapterSummarySub}>
                {chapter?.introTitle || "—"}
                {background ? ` · พื้นหลัง: ${background.label}` : ""}
              </div>
            </div>
            <button
              type="button"
              className={`${styles.adminBtn} ${styles.adminBtnSecondary}`}
              aria-expanded={showChapterForm}
              onClick={() => {
                setShowChapterForm((v) => !v);
                setChapterSaved(false);
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              {showChapterForm ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
              {showChapterForm ? "ซ่อน" : "แก้ไขข้อมูลบท"}
            </button>
          </div>

          {showChapterForm && (
            <div className={styles.adminFormCard}>
              <h2>Chapter Info</h2>
              <form onSubmit={handleSaveChapter} onChange={() => setChapterSaved(false)}>
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
                  <div className={`${styles.adminFormField} ${styles.full}`}>
                    <label className={styles.adminLabel}>Background Image (optional)</label>
                    <AdminBackgroundPicker
                      value={chapterForm.backgroundImageUrl}
                      onChange={(url) => setChapterForm({ ...chapterForm, backgroundImageUrl: url })}
                    />
                  </div>
                </div>
                <div className={styles.adminFormActions}>
                  {chapterSaved && <span className={styles.sceneSavedNote}>บันทึกแล้ว ✓</span>}
                  <button type="submit" className={`${styles.adminBtn} ${styles.adminBtnPrimary}`}>บันทึก</button>
                </div>
              </form>
            </div>
          )}

          {/* Scenes — list on the left, sticky editor on the right */}
          <div className={styles.sceneWorkspace}>
            <section aria-label="Scenes">
              <div className={styles.sceneListHeader}>
                <h2 className={styles.sceneListTitle}>
                  Scenes<span className={styles.sceneListCount}>({sceneList.length})</span>
                </h2>
                <button
                  className={`${styles.adminBtn} ${styles.adminBtnPrimary}`}
                  onClick={openCreateScene}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                >
                  <Plus size={16} aria-hidden="true" /> เพิ่ม Scene
                </button>
              </div>

              {scenesLoading ? (
                <div className={styles.adminSpinner} />
              ) : sceneList.length === 0 ? (
                <div className={styles.adminEmpty}>ยังไม่มี scene — กด “เพิ่ม Scene” เพื่อเริ่ม</div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={sceneList.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <ul className={styles.sceneList}>
                      {sceneList.map((scene) => (
                        <SortableSceneCard
                          key={scene.id}
                          scene={scene}
                          selected={showSceneForm && scene.id === editSceneId}
                          onSelect={selectScene}
                          onDelete={handleDeleteScene}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}
            </section>

            {showSceneForm ? (
              <>
                <div className={styles.sceneBackdrop} onClick={closeSceneForm} aria-hidden="true" />
                <aside className={styles.sceneEditor} aria-label="Scene editor">
                  <div className={styles.sceneEditorHeader}>
                    <h2 className={styles.sceneEditorTitle}>
                      {editSceneId !== null
                        ? `แก้ไข Scene #${editIndex >= 0 ? sceneList[editIndex].index : sceneForm.idx}`
                        : "เพิ่ม Scene ใหม่"}
                      {isSceneDirty && <span style={{ color: "#d29922", marginLeft: "0.4rem" }} title="ยังไม่บันทึก">●</span>}
                    </h2>
                    {editSceneId !== null && (
                      <>
                        <button
                          type="button"
                          className={styles.sceneIconBtn}
                          title="Scene ก่อนหน้า"
                          aria-label="Scene ก่อนหน้า"
                          disabled={editIndex <= 0}
                          onClick={() => stepScene(-1)}
                        >
                          <ChevronLeft size={18} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={styles.sceneIconBtn}
                          title="Scene ถัดไป"
                          aria-label="Scene ถัดไป"
                          disabled={editIndex < 0 || editIndex >= sceneList.length - 1}
                          onClick={() => stepScene(1)}
                        >
                          <ChevronRight size={18} aria-hidden="true" />
                        </button>
                      </>
                    )}
                    <button type="button" className={styles.sceneIconBtn} title="ปิด (Esc)" aria-label="ปิด" onClick={closeSceneForm}>
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                  <form ref={sceneFormRef} onSubmit={handleSubmitScene} style={{ display: "contents" }}>
                    <div className={styles.sceneEditorBody}>
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
                          <label className={styles.adminLabel}>ประเภท Scene</label>
                          <select
                            className={styles.adminSelect}
                            value={sceneForm.type}
                            onChange={(e) =>
                              setSceneForm({ ...sceneForm, type: e.target.value as SceneType })
                            }
                          >
                            <option value="system">System (ไม่มีตัวละคร)</option>
                            <option value="actor">Actor (มีตัวละคร)</option>
                          </select>
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
                        {sceneForm.type === "actor" && (
                          <div className={styles.adminFormField}>
                            <label className={styles.adminLabel}>ตัวละคร</label>
                            <select
                              className={styles.adminSelect}
                              value={characterKey}
                              onChange={(e) => applyCharacterKey(e.target.value)}
                            >
                              {CHARACTER_PRESETS.map((p) => (
                                <option key={p.key} value={p.key}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      {sceneForm.type === "actor" && sceneForm.actorKind === "main" && (
                          <>
                            <div className={styles.adminFormField}>
                              <label className={styles.adminLabel}>Speaker Name</label>
                              <input className={styles.adminInput} value={MAIN_ACTOR_SPEAKER_NAME} disabled />
                            </div>
                            <div className={`${styles.adminFormField} ${styles.full}`}>
                              <label className={styles.adminLabel}>
                                รูปตัวละคร — ใช้รูปจากหน้าลงทะเบียน (แสดงตามเพศที่ผู้ใช้เลือก)
                              </label>
                              <div style={{ display: "flex", gap: "1.5rem" }}>
                                {(
                                  [
                                    ["ชาย", MAIN_ACTOR_IMAGE_URLS.male],
                                    ["หญิง", MAIN_ACTOR_IMAGE_URLS.female],
                                  ] as const
                                ).map(([label, src]) => (
                                  <figure key={label} style={{ margin: 0, textAlign: "center" }}>
                                    <Image
                                      src={src}
                                      alt={`ตัวละครหลัก (${label})`}
                                      width={73}
                                      height={110}
                                      style={{ height: "110px", width: "auto", objectFit: "contain" }}
                                    />
                                    <figcaption style={{ fontSize: "0.85rem", marginTop: "0.25rem", color: "#8b949e" }}>
                                      {label}
                                    </figcaption>
                                  </figure>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                        {sceneForm.type === "actor" && sceneForm.actorKind === "other" && (
                          <>
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
                              <label className={styles.adminLabel}>
                                Speaker Image
                                {(() => {
                                  const preset = findCharacterPreset(characterKey);
                                  return preset && preset.kind === "preset" && preset.images.length === 0
                                    ? " — ยังไม่มีรูปของตัวละครนี้ เลือกจากทั้งหมดด้านล่างได้"
                                    : "";
                                })()}
                              </label>
                              {pickerGroups().map((group) => (
                                <div key={group.label}>
                                  <div className={styles.adminPickerGroupLabel}>
                                    {group.label}
                                  </div>
                                  <div className={styles.adminImagePicker}>
                                    {group.images.map((img) => {
                                      const selected = (sceneForm.speakerImageUrl ?? "") === img;
                                      return (
                                        <button
                                          key={img}
                                          type="button"
                                          title={group.label}
                                          onClick={() => setSceneForm({ ...sceneForm, speakerImageUrl: img })}
                                          className={`${styles.adminImageTile} ${selected ? styles.adminImageTileSelected : ""}`}
                                        >
                                          <Image
                                            src={img}
                                            alt={group.label}
                                            fill
                                            sizes="20vw"
                                            style={{ objectFit: "contain" }}
                                            className={styles.adminImageTileImg}
                                          />
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        <div className={`${styles.adminFormField} ${styles.full}`}>
                          <label className={styles.adminLabel}>พื้นหลังของ Scene (ไม่บังคับ — ถ้าเลือกจะใช้แทนพื้นหลังของบท)</label>
                          {(() => {
                            const ownBg = sceneForm.backgroundImageUrl ?? "";
                            const effective = ownBg || chapter?.backgroundImageUrl || "";
                            const label = ownBg
                              ? findChapterBackground(ownBg)?.label ?? ownBg
                              : `ใช้พื้นหลังของบท${background ? ` (${background.label})` : ""}`;
                            return (
                              <button
                                type="button"
                                className={styles.sceneBgSummary}
                                aria-expanded={showSceneBgPicker}
                                onClick={() => setShowSceneBgPicker((v) => !v)}
                              >
                                <span className={styles.sceneBgSummaryThumb}>
                                  {effective && (
                                    <Image src={effective} alt="" fill sizes="72px" style={{ objectFit: "cover", opacity: ownBg ? 1 : 0.5 }} />
                                  )}
                                </span>
                                <span className={styles.sceneBgSummaryText}>{label}</span>
                                <span className={styles.sceneBgSummaryAction}>
                                  {showSceneBgPicker ? "ซ่อน" : "เปลี่ยน"}
                                  {showSceneBgPicker ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                                </span>
                              </button>
                            );
                          })()}
                          {showSceneBgPicker && (
                            <div style={{ marginTop: "0.5rem" }}>
                              <AdminBackgroundPicker
                                compact
                                value={sceneForm.backgroundImageUrl ?? ""}
                                inheritUrl={chapter?.backgroundImageUrl ?? ""}
                                onChange={(url) => setSceneForm({ ...sceneForm, backgroundImageUrl: url })}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={styles.sceneEditorFooter}>
                      {sceneSaved && !isSceneDirty ? (
                        <span className={styles.sceneSavedNote}>บันทึกแล้ว ✓</span>
                      ) : (
                        <span className={styles.sceneEditorHint}>Ctrl+Enter บันทึก · Esc ปิด</span>
                      )}
                      <button type="button" className={`${styles.adminBtn} ${styles.adminBtnSecondary}`} onClick={closeSceneForm}>
                        ปิด
                      </button>
                      <button
                        type="submit"
                        className={`${styles.adminBtn} ${styles.adminBtnPrimary}`}
                        disabled={sceneSaving || (editSceneId !== null && !isSceneDirty)}
                      >
                        {sceneSaving ? "กำลังบันทึก…" : editSceneId !== null ? "บันทึก" : "เพิ่ม"}
                      </button>
                    </div>
                  </form>
                </aside>
              </>
            ) : (
              <aside className={`${styles.sceneEditor} ${styles.sceneEditorIdle}`} aria-label="Scene editor">
                <div className={styles.sceneEditorEmpty}>
                  เลือก scene ทางซ้ายเพื่อแก้ไข
                  <br />
                  หรือกด “เพิ่ม Scene” เพื่อสร้างใหม่
                </div>
              </aside>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
