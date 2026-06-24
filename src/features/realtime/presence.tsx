"use client";

export function PresenceStack({
  viewers,
}: {
  viewers: { membershipId: string; name: string }[];
}) {
  if (viewers.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1.5">
        {viewers.slice(0, 4).map((viewer) => (
          <span
            key={viewer.membershipId}
            title={viewer.name}
            className="bg-primary text-primary-foreground inline-flex size-6 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-background"
          >
            {initials(viewer.name)}
          </span>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        {viewers.length === 1
          ? `${viewers[0]!.name} is viewing`
          : `${viewers.length} agents viewing`}
      </p>
    </div>
  );
}

export function TypingIndicator({
  name,
}: {
  name: string | null | undefined;
}) {
  if (!name) return null;
  return (
    <p className="text-muted-foreground px-1 text-xs" aria-live="polite">
      {name} is typing…
    </p>
  );
}

export function CollisionBanner({
  name,
}: {
  name: string | null | undefined;
}) {
  if (!name) return null;
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
      {name} is replying…
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
