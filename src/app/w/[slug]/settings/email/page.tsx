import { notFound } from "next/navigation";
import { getTenantContext } from "@/server/tenancy/context";
import { assertCan } from "@/server/tenancy/permissions";
import { ForbiddenError } from "@/lib/api-error";
import {
  getWorkspaceInboundAddress,
  hasReceivedInboundEmail,
  listRecentInboundEmails,
} from "@/server/services/inbound-email.service";
import { SettingsLayout } from "@/components/layout/settings-layout";
import { EmailSettingsPanel } from "@/features/email-settings/components/email-settings";
import { SettingsAccessDenied } from "@/components/settings-access-denied";

export default async function EmailSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getTenantContext(slug);

  try {
    assertCan(ctx, "settings.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return <SettingsAccessDenied slug={slug} readonly={ctx.readonly} />;
    }
    throw error;
  }

  const inboundAddress = await getWorkspaceInboundAddress(ctx);
  if (!inboundAddress) notFound();

  const [recent, testDetected] = await Promise.all([
    listRecentInboundEmails(ctx),
    hasReceivedInboundEmail(ctx),
  ]);

  return (
    <SettingsLayout
      title="Email"
      description="Inbound address, forwarding setup, and delivery checks."
    >
      <EmailSettingsPanel
        slug={slug}
        inboundAddress={inboundAddress}
        recent={recent}
        testDetected={testDetected}
      />
    </SettingsLayout>
  );
}
