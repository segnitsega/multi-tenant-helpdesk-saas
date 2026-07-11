import "server-only";
import { UnrecoverableError } from "bullmq";
import { runForEvent } from "@/server/services/automation.service";
import type { AutomationJob } from "@/server/jobs/queues";

export async function processAutomation(job: AutomationJob) {
  if (!job.workspaceId || !job.ticketId || !job.trigger) {
    throw new UnrecoverableError("Invalid automation job");
  }

  return runForEvent(
    { workspaceId: job.workspaceId, membershipId: null },
    {
      ticketId: job.ticketId,
      trigger: job.trigger,
      origin: job.origin ?? "system",
    },
  );
}
