"use client";

import { useEffect, useRef } from "react";

type HotkeyOptions = {
  enabled?: boolean;
  preventDefault?: boolean;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function normalizeChord(chord: string): string {
  return chord
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace("command", "meta")
    .replace("cmd", "meta")
    .replace("control", "ctrl")
    .replace("option", "alt");
}

function eventMatchesChord(event: KeyboardEvent, chord: string): boolean {
  const parts = normalizeChord(chord).split("+").filter(Boolean);
  const key = parts[parts.length - 1];
  if (!key) return false;

  const wantMeta = parts.includes("meta");
  const wantCtrl = parts.includes("ctrl");
  const wantAlt = parts.includes("alt");
  const wantShift = parts.includes("shift");

  if (Boolean(event.metaKey) !== wantMeta) return false;
  if (Boolean(event.ctrlKey) !== wantCtrl) return false;
  if (Boolean(event.altKey) !== wantAlt) return false;

  const keyMatches =
    event.key.toLowerCase() === key || event.key === key;
  if (!keyMatches) return false;

  if (Boolean(event.shiftKey) !== wantShift) {
    if (!(wantShift === false && event.key === key && /[^a-z0-9]/i.test(key))) {
      return false;
    }
  }

  return true;
}

export function useHotkeys(
  keys: string | string[],
  callback: (event: KeyboardEvent) => void,
  options: HotkeyOptions = {},
) {
  const { enabled = true, preventDefault = true } = options;
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const bindings = (Array.isArray(keys) ? keys : [keys]).map((raw) =>
      raw.trim().toLowerCase(),
    );
    const sequences = bindings.filter((b) => b.includes(" "));
    const singles = bindings.filter((b) => !b.includes(" "));
    let pendingPrefix: string | null = null;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    const clearPending = () => {
      pendingPrefix = null;
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.repeat) return;

      for (const chord of singles) {
        if (!eventMatchesChord(event, chord)) continue;
        if (preventDefault) event.preventDefault();
        clearPending();
        callbackRef.current(event);
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        clearPending();
        return;
      }

      const key = event.key.toLowerCase();
      if (key.length !== 1) return;

      if (pendingPrefix) {
        const full = `${pendingPrefix} ${key}`;
        if (sequences.includes(full)) {
          if (preventDefault) event.preventDefault();
          clearPending();
          callbackRef.current(event);
          return;
        }
        clearPending();
      }

      const isPrefix = sequences.some((seq) => seq.startsWith(`${key} `));
      if (isPrefix) {
        pendingPrefix = key;
        pendingTimer = setTimeout(clearPending, 1000);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearPending();
    };
  }, [keys, enabled, preventDefault]);
}
