"use client";

import { useEffect, useState } from "react";

function draftKey(slug: string, ticketNumber: number, mode: string) {
  return `relay:draft:${slug}:${ticketNumber}:${mode}`;
}

export function useDraft(
  slug: string,
  ticketNumber: number,
  mode: string,
): [string, (value: string) => void, () => void] {
  const key = draftKey(slug, ticketNumber, mode);
  const [value, setValue] = useState("");

  useEffect(() => {
    try {
      setValue(window.localStorage.getItem(key) ?? "");
    } catch {
      setValue("");
    }
  }, [key]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (!value.trim()) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      } catch {
        return;
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [key, value]);

  function clear() {
    setValue("");
    try {
      window.localStorage.removeItem(key);
    } catch {
      return;
    }
  }

  return [value, setValue, clear];
}
