import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SettingsLayout } from "@/components/layout/settings-layout";

export function SettingsAccessDenied({
  slug,
  readonly = false,
}: {
  slug: string;
  readonly?: boolean;
}) {
  return (
    <SettingsLayout
      title="Access restricted"
      description={
        readonly
          ? "This page isn’t available for read-only viewers. You can browse tickets, but management changes are disabled."
          : "You don’t have permission to open this settings page. Ask a workspace owner or admin if you need access."
      }
    >
      <Button render={<Link href={`/w/${slug}/inbox`} />}>Back to inbox</Button>
    </SettingsLayout>
  );
}
