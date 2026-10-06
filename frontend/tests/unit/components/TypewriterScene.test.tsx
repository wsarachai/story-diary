import { describe, it, expect, vi, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import TypewriterScene from "@/components/TypewriterScene";
import { TYPEWRITER_SPEED_MS } from "@/lib/typewriter";

/** Text the reader can see: everything except the visibility:hidden spans. */
function visibleText(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('span[style*="visibility: hidden"]').forEach((s) => s.remove());
  return clone.textContent ?? "";
}

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

afterEach(() => vi.useRealTimers());

describe("TypewriterScene", () => {
  it("reveals a whole Thai cluster per tick", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const { container } = render(<TypewriterScene fullText="ที่นี่" onTypingDone={onDone} />);
    expect(visibleText(container)).toBe("");
    advance(TYPEWRITER_SPEED_MS);
    expect(visibleText(container)).toBe("ที่"); // consonant + both marks together
    advance(TYPEWRITER_SPEED_MS);
    expect(visibleText(container)).toBe("ที่นี่");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("finishes a typical Thai scene line in under 3 seconds", () => {
    vi.useFakeTimers();
    const line =
      "หมู่บ้านแห่งนี้…เคยได้รับพรจากเทพีผู้พิทักษ์ และเต็มไปด้วยเสียงหัวเราะ แต่ตอนนี้…กลับถูกปกคลุมด้วยหมอก";
    const onDone = vi.fn();
    const { container } = render(<TypewriterScene fullText={line} onTypingDone={onDone} />);
    // Each tick schedules the next after React re-renders, so step per tick.
    for (let elapsed = 0; elapsed < 3000; elapsed += TYPEWRITER_SPEED_MS) {
      advance(TYPEWRITER_SPEED_MS);
    }
    expect(visibleText(container)).toBe(line);
    expect(onDone).toHaveBeenCalled();
  });

  it("keeps not-yet-typed text in layout so lines don't reflow", () => {
    vi.useFakeTimers();
    const { container } = render(<TypewriterScene fullText={"ab\ncd"} onTypingDone={() => {}} />);
    advance(TYPEWRITER_SPEED_MS);
    expect(container.textContent).toBe("abcd");
    expect(visibleText(container)).toBe("a");
  });
});
