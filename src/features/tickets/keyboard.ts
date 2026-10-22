"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHotkeys } from "@/hooks/use-hotkeys";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useInboxHotkeys({
  slug,
  numbers,
  activeNumber,
  onToggleSelect,
  onAssignMe,
  onResolve,
  onPending,
  onFocusSearch,
}: {
  slug: string;
  numbers: number[];
  activeNumber?: number;
  onToggleSelect?: (number: number) => void;
  onAssignMe?: () => void;
  onResolve?: () => void;
  onPending?: () => void;
  onFocusSearch?: () => void;
}) {
  const router = useRouter();

  useHotkeys("j", () => {
    if (!numbers.length) return;
    const index = activeNumber ? numbers.indexOf(activeNumber) : -1;
    const next = numbers[Math.min(numbers.length - 1, Math.max(0, index + 1))];
    if (next) router.push(`/w/${slug}/inbox/${next}`);
  });

  useHotkeys("k", () => {
    if (!numbers.length) return;
    const index = activeNumber ? numbers.indexOf(activeNumber) : numbers.length;
    const next = numbers[Math.max(0, index - 1)];
    if (next) router.push(`/w/${slug}/inbox/${next}`);
  });

  useHotkeys("enter", () => {
    if (activeNumber) router.push(`/w/${slug}/inbox/${activeNumber}`);
  });

  useHotkeys("x", () => {
    if (activeNumber) onToggleSelect?.(activeNumber);
  });

  useHotkeys("/", () => {
    onFocusSearch?.();
  });

  useHotkeys("a", () => onAssignMe?.());
  useHotkeys("e", () => onResolve?.());
  useHotkeys("p", () => onPending?.());

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
