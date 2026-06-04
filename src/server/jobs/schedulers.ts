import "server-only";
import { cleanupQueue, slaScanQueue } from "@/server/jobs/queues";

export async function registerSchedulers() {
  await slaScanQueue.upsertJobScheduler(
    "sla-scan-repeat",
    { every: 60_000 },
    {
      name: "scan",
      data: {},
    },
  );

  await cleanupQueue.upsertJobScheduler(
    "cleanup-repeat",
    { every: 24 * 60 * 60 * 1000 },
    {
      name: "run",
      data: { olderThanDays: 30 },
    },
  );
}
