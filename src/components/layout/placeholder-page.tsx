import { EmptyState } from "@/components/empty-state";

export function PlaceholderPage({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <EmptyState icon={icon} title={title} description={description} />
    </div>
  );
}
