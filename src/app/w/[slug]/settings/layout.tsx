import { getTenantContext } from "@/server/tenancy/context";
import { SettingsNav } from "@/components/layout/settings-layout";

export default async function WorkspaceSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await getTenantContext(slug);

  return (
    <div className="flex w-full max-w-5xl flex-col px-4 py-6 lg:flex-row">
      <SettingsNav slug={slug} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
