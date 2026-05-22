import { QuizProvider } from "./QuizProvider";

export default function MinigameLayout({ children }: { children: React.ReactNode }) {
  return <QuizProvider>{children}</QuizProvider>;
}
