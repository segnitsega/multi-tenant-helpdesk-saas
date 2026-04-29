"use client";

import { createContext, useContext, useMemo } from "react";
import { ConnectionBanner } from "@/features/realtime/connection-banner";
import { useRealtime, type ConnectionStatus } from "@/features/realtime/use-realtime";
import type { RealtimeEvent } from "@/types/events";

type RealtimeContextValue = {
  slug: string;
  workspaceId: string;
  membershipId: string;
  agentName: string;
  status: ConnectionStatus;
  lastEvent: RealtimeEvent | null;
  newTicketNumbers: number[];
  highlighted: Set<number>;
  clearNewTickets: () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({
  slug,
  workspaceId,
  membershipId,
  agentName,
  children,
}: {
  slug: string;
  workspaceId: string;
  membershipId: string;
  agentName: string;
  children: React.ReactNode;
}) {
  const realtime = useRealtime(slug);
  const value = useMemo(
    () => ({
      slug,
      workspaceId,
      membershipId,
      agentName,
      ...realtime,
    }),
    [agentName, membershipId, realtime, slug, workspaceId],
  );

  return (
    <RealtimeContext.Provider value={value}>
      <ConnectionBanner status={realtime.status} />
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  const value = useContext(RealtimeContext);
  if (!value) {
    throw new Error("useRealtimeContext must be used within RealtimeProvider");
  }
  return value;
}

export function useOptionalRealtime() {
  return useContext(RealtimeContext);
}
