import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UpgradePrompt({
  slug,
  title = "Upgrade to continue",
  description,
  className,
}: {
  slug: string;
  title?: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "border-border bg-muted/40 flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <Button render={<Link href={`/w/${slug}/settings/billing`} />} size="sm">
        View plans
      </Button>
    </div>
  );
}
