"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

function ChartFallback() {
  return <Skeleton className="h-64 w-full" />;
}

export const VolumeLineChartLazy = dynamic(
  () =>
    import("@/components/charts/line-chart").then((mod) => mod.VolumeLineChart),
  { ssr: false, loading: () => <ChartFallback /> },
);

export const StatusBarChartLazy = dynamic(
  () =>
    import("@/components/charts/bar-chart").then((mod) => mod.StatusBarChart),
  { ssr: false, loading: () => <ChartFallback /> },
);

export const ChannelBarChartLazy = dynamic(
  () =>
    import("@/components/charts/bar-chart").then((mod) => mod.ChannelBarChart),
  { ssr: false, loading: () => <ChartFallback /> },
);

export const HoursHeatmapLazy = dynamic(
  () => import("@/components/charts/heatmap").then((mod) => mod.HoursHeatmap),
  { ssr: false, loading: () => <ChartFallback /> },
);
