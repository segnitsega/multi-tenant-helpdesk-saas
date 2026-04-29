"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { handleRealtimeEvent } from "@/features/realtime/event-handlers";
import type { RealtimeEvent } from "@/types/events";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export function useRealtime(slug: string) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [newTicketNumbers, setNewTicketNumbers] = useState<number[]>([]);
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  const lastEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    let closed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let source: EventSource | null = null;

    function connect() {
      if (closed) return;
      setStatus((prev) => (prev === "connected" ? prev : "connecting"));
      const params = new URLSearchParams();
      if (lastEventIdRef.current) {
        params.set("lastEventId", lastEventIdRef.current);
      }
      const url = `/api/w/${slug}/events${
        params.size ? `?${params.toString()}` : ""
      }`;
      source = new EventSource(url);

      source.onopen = () => {
        if (!closed) setStatus("connected");
      };

      source.onerror = () => {
        if (closed) return;
        setStatus("disconnected");
        source?.close();
        retryTimer = setTimeout(connect, 1500);
      };

      const onEvent = (type: RealtimeEvent["type"]) => (raw: MessageEvent) => {
        try {
          const event = JSON.parse(String(raw.data)) as RealtimeEvent;
          lastEventIdRef.current = event.id;
          setLastEvent(event);
          handleRealtimeEvent(queryClient, slug, event, {
            onNewTicket: (number) => {
              setNewTicketNumbers((prev) =>
                prev.includes(number) ? prev : [...prev, number],
              );
            },
            onHighlightTicket: (number) => {
              setHighlighted((prev) => new Set(prev).add(number));
              window.setTimeout(() => {
                setHighlighted((prev) => {
                  const next = new Set(prev);
                  next.delete(number);
                  return next;
                });
              }, 2500);
            },
          });
          if (type === "resync" || event.type === "resync") {
            setNewTicketNumbers([]);
          }
        } catch {
          return;
        }
      };

      const types: RealtimeEvent["type"][] = [
        "ticket.created",
        "ticket.updated",
        "message.created",
        "presence.updated",
        "typing.updated",
        "sla.breached",
        "resync",
      ];
      for (const type of types) {
        source.addEventListener(type, onEvent(type));
      }
      source.onmessage = onEvent("ticket.updated");
    }

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    };
  }, [queryClient, slug]);

  return {
    status,
    lastEvent,
    newTicketNumbers,
    highlighted,
    clearNewTickets: () => setNewTicketNumbers([]),
  };
}
