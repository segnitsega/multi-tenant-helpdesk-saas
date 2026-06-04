import "server-only";
import type { CleanupJob } from "@/server/jobs/queues";

export async function processCleanup(_job: CleanupJob) {
  return { cleaned: 0 };
}
