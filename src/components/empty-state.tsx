import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Pass buttons/links from the parent (keeps this component flexible). */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="text-muted-foreground flex size-10 items-center justify-center [&_svg]:size-8">
          {icon}
        </div>
      ) : null}
      <div className="flex max-w-sm flex-col gap-1">
        <h3 className="text-foreground text-base font-semibold">{title}</h3>
        {description ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}
