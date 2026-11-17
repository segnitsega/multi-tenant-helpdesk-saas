import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="text-foreground text-sm font-medium tracking-tight"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className={cn("text-destructive text-xs")} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
