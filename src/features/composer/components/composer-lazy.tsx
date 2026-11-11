"use client";

import dynamic from "next/dynamic";

export const ComposerLazy = dynamic(
  () =>
    import("@/features/composer/components/composer").then(
      (mod) => mod.Composer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground rounded-md border border-dashed px-3 py-8 text-center text-sm">
        Loading editor…
      </div>
    ),
  },
);
