import Link from "next/link";
import { redirect } from "next/navigation";
import { consumePortalMagicLink } from "@/server/services/portal.service";
import { setCustomerSession } from "@/server/auth/customer-session";
import { Button } from "@/components/ui/button";

export default async function PortalVerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";

  if (!token) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Missing link</h1>
        <Button render={<Link href={`/portal/${slug}`} />}>Back to portal</Button>
      </div>
    );
  }

  try {
    const result = await consumePortalMagicLink(token);
    if (result.slug !== slug) {
      throw new Error("slug mismatch");
    }
    await setCustomerSession({
      customerId: result.customerId,
      workspaceId: result.workspaceId,
      kind: "portal",
    });
    redirect(`/portal/${slug}`);
  } catch {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Link expired</h1>
        <p className="text-muted-foreground text-sm">
          Request a new sign-in email from the portal.
        </p>
        <Button render={<Link href={`/portal/${slug}`} />}>Try again</Button>
      </div>
    );
  }
}
