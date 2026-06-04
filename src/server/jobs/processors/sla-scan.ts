import "server-only";
import type { SlaScanJob } from "@/server/jobs/queues";

export async function processSlaScan(_job: SlaScanJob) {
  return { scanned: 0 };
}
