export function AuthDivider({
  label = "or continue with email",
}: {
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="border-border h-px flex-1 border-t" />
      <p className="text-muted-foreground shrink-0 text-xs">{label}</p>
      <div className="border-border h-px flex-1 border-t" />
    </div>
  );
}
