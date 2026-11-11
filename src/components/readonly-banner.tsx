import { cn } from "@/lib/utils";

export function ReadonlyBanner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "border-border bg-muted/60 text-muted-foreground border-b px-4 py-2 text-center text-sm",
        className,
      )}
    >
      You are viewing a read-only demo. Changes are disabled.
    </div>
  );
}
