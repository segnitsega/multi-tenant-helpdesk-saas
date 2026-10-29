import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PastDueBanner({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "border-destructive/30 bg-destructive/10 text-destructive flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <p className="text-sm font-medium">Payment past due</p>
        <p className="text-destructive/80 text-sm">
          Update your payment method to keep Pro features. Access stays open
          during the grace period; afterward limits fall back to Free.
        </p>
      </div>
      <Button
        render={<Link href={`/w/${slug}/settings/billing`} />}
        size="sm"
        variant="outline"
      >
        Manage billing
      </Button>
    </div>
  );
}
