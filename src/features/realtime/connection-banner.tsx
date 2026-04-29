"use client";

export function ConnectionBanner({
  status,
}: {
  status: "connected" | "connecting" | "disconnected";
}) {
  if (status === "connected") return null;

  return (
    <div
      className={
        status === "connecting"
          ? "bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
          : "bg-destructive/10 text-destructive"
      }
      role="status"
    >
      <p className="px-4 py-1.5 text-center text-xs font-medium">
        {status === "connecting"
          ? "Reconnecting to live updates…"
          : "Live updates disconnected. Retrying…"}
      </p>
    </div>
  );
}
