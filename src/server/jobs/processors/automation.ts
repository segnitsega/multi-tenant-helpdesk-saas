import "server-only";
import type { AutomationJob } from "@/server/jobs/queues";

export async function processAutomation(_job: AutomationJob) {
  return { ran: false as const };
}
