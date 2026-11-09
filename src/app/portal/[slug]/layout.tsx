export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="mx-auto w-full max-w-3xl px-4 py-10">{children}</div>
    </div>
  );
}
