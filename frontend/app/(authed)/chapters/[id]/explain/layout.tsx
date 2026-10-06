import SceneAudioLifecycle from "@/components/SceneAudioLifecycle";

/**
 * Shared by the chapter intro and its scene routes. It persists across scene
 * navigation, so it owns "stop the music when the reader leaves the scenes".
 */
export default function ChapterExplainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SceneAudioLifecycle />
      {children}
    </>
  );
}
