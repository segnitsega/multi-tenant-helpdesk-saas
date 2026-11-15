import "server-only";
import { Queue, type JobsOptions } from "bullmq";
import { bullRedis } from "@/server/redis";

export const QUEUE_NAMES = {
  emailInbound: "emailInbound",
  emailOutbound: "emailOutbound",
  slaScan: "slaScan",
  automation: "automation",
  cleanup: "cleanup",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export type EmailInboundJob = {
  inboundEmailId: string;
};

export type EmailOutboundJob = {
  workspaceId: string;
  messageId: string;
};

export type SlaScanJob = {
  workspaceId?: string;
};

export type AutomationJob = {
  workspaceId: string;
  ticketId: string;
  trigger: string;
  origin?: "automation" | "user" | "system" | "email";
};

export type CleanupJob = {
  olderThanDays?: number;
};

const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

function createQueue<T>(name: QueueName) {
  return new Queue<T>(name, {
    connection: bullRedis,
    defaultJobOptions,
  });
}

export const emailInboundQueue = createQueue<EmailInboundJob>(
  QUEUE_NAMES.emailInbound,
);
export const emailOutboundQueue = createQueue<EmailOutboundJob>(
  QUEUE_NAMES.emailOutbound,
);
export const slaScanQueue = createQueue<SlaScanJob>(QUEUE_NAMES.slaScan);
export const automationQueue = createQueue<AutomationJob>(
  QUEUE_NAMES.automation,
);
export const cleanupQueue = createQueue<CleanupJob>(QUEUE_NAMES.cleanup);

export async function enqueueEmailInbound(
  inboundEmailId: string,
  providerMessageId: string,
) {
  await emailInboundQueue.add(
    "process",
    { inboundEmailId },
    { jobId: `inbound-${providerMessageId}` },
  );
}

export async function enqueueEmailOutbound(
  workspaceId: string,
  messageId: string,
) {
  await emailOutboundQueue.add(
    "send",
    { workspaceId, messageId },
    { jobId: `outbound-${messageId}` },
  );
}

export async function enqueueSlaScan(workspaceId?: string) {
  await slaScanQueue.add(
    "scan",
    { workspaceId },
    {
      jobId: workspaceId ? `sla-${workspaceId}-${Date.now()}` : undefined,
    },
  );
}

export async function enqueueAutomation(input: AutomationJob) {
  if (input.origin === "automation") return;
  await automationQueue.add("run", input, {
    jobId: `auto-${input.ticketId}-${input.trigger}-${Date.now()}`,
  });
}

export async function enqueueCleanup(olderThanDays = 30) {
  await cleanupQueue.add(
    "run",
    { olderThanDays },
    { jobId: `cleanup-${olderThanDays}-${Date.now()}` },
  );
}
