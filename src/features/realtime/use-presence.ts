"use client";

import { useEffect, useMemo, useState } from "react";
import { useOptionalRealtime } from "@/features/realtime/realtime-provider";
import type { PresenceViewer } from "@/types/events";

export function usePresence(ticketId: string | null | undefined) {
  const realtime = useOptionalRealtime();
  const [viewers, setViewers] = useState<PresenceViewer[]>([]);
  const [typing, setTyping] = useState<{
    membershipId: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!ticketId || !realtime) return;

    let cancelled = false;

    async function beat() {
      const response = await fetch(
        `/api/w/${realtime!.slug}/tickets/${ticketId}/presence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ drafting: false }),
        },
      );
      const json = await response.json();
      if (!cancelled && json.ok) {
        setViewers(json.data.viewers as PresenceViewer[]);
      }
    }

    void beat();
    const interval = window.setInterval(() => {
      void beat();
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [realtime, ticketId]);

  useEffect(() => {
    if (!ticketId || !realtime?.lastEvent) return;
    const event = realtime.lastEvent;
    if (
      event.type === "presence.updated" &&
      event.payload.ticketId === ticketId
    ) {
      setViewers(event.payload.viewers);
    }
    if (
      event.type === "typing.updated" &&
      event.payload.ticketId === ticketId &&
      event.payload.membershipId !== realtime.membershipId
    ) {
      if (event.payload.isTyping) {
        setTyping({
          membershipId: event.payload.membershipId,
          name: event.payload.name,
        });
      } else {
        setTyping((prev) =>
          prev?.membershipId === event.payload.membershipId ? null : prev,
        );
      }
    }
  }, [realtime?.lastEvent, realtime?.membershipId, ticketId]);

  const others = useMemo(
    () =>
      viewers.filter(
        (viewer) => viewer.membershipId !== realtime?.membershipId,
      ),
    [realtime?.membershipId, viewers],
  );

  const draftingOther = others.find((viewer) => viewer.drafting) ?? null;

  async function setTypingState(isTyping: boolean) {
    if (!ticketId || !realtime) return;
    await fetch(`/api/w/${realtime.slug}/tickets/${ticketId}/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drafting: isTyping, typing: isTyping }),
    });
  }

  return {
    viewers: others,
    draftingOther,
    typing,
    setTypingState,
  };
}
