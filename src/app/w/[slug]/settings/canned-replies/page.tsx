import { getTenantContext } from "@/server/tenancy/context";
import { assertCan } from "@/server/tenancy/permissions";
import { ForbiddenError } from "@/lib/api-error";
import { listCannedReplies } from "@/server/services/canned-reply.service";
import { CannedRepliesSettings } from "@/features/canned-replies/components/canned-replies-settings";
import { SettingsLayout } from "@/components/layout/settings-layout";
import { SettingsAccessDenied } from "@/components/settings-access-denied";

export default async function CannedRepliesSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getTenantContext(slug);

  try {
    assertCan(ctx, "canned.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return <SettingsAccessDenied slug={slug} readonly={ctx.readonly} />;
    }
    throw error;
  }

  const replies = await listCannedReplies(ctx);

  return (
    <SettingsLayout
      title="Canned replies"
      description="Reusable replies with shortcuts and variables."
    >
      <CannedRepliesSettings
        slug={slug}
        replies={replies.map((row) => ({
          id: row.id,
          title: row.title,
          shortcut: row.shortcut,
          bodyHtml: row.bodyHtml,
        }))}
      />
    </SettingsLayout>
  );
}
