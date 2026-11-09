import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/server/auth/customer-session";
import { PortalNewRequestForm } from "@/features/portal/components/portal-new-request-form";
import { Button } from "@/components/ui/button";

export default async function PortalNewRequestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getCustomerSession("portal");
  if (!session) redirect(`/portal/${slug}`);

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 px-0"
          render={<Link href={`/portal/${slug}`} />}
        >
          ← Back
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">New request</h1>
      </div>
      <PortalNewRequestForm slug={slug} />
    </div>
  );
}
