import { Worker } from "bullmq";
import { bullRedis } from "../src/server/redis";
import {
  QUEUE_NAMES,
  type AutomationJob,
  type CleanupJob,
  type EmailInboundJob,
  type EmailOutboundJob,
  type SlaScanJob,
} from "../src/server/jobs/queues";
import { registerSchedulers } from "../src/server/jobs/schedulers";
import { processEmailInbound } from "../src/server/jobs/processors/email-inbound";
import { processEmailOutbound } from "../src/server/jobs/processors/email-outbound";
import { processSlaScan } from "../src/server/jobs/processors/sla-scan";
import { processAutomation } from "../src/server/jobs/processors/automation";
import { processCleanup } from "../src/server/jobs/processors/cleanup";

const workers: Worker[] = [];

function startWorker<T>(
  name: string,
  processor: (
    data: T,
    meta: { attemptsMade: number; maxAttempts: number },
  ) => Promise<unknown>,
  concurrency: number,
) {
  const worker = new Worker<T>(
    name,
    async (job) => {
      const maxAttempts =
        typeof job.opts.attempts === "number" ? job.opts.attempts : 5;
      return processor(job.data, {
        attemptsMade: job.attemptsMade,
        maxAttempts,
      });
    },
    {
      connection: bullRedis,
      concurrency,
    },
  );

  worker.on("failed", (job, error) => {
    console.error(`[worker:${name}] job failed`, job?.id, error);
  });
  worker.on("completed", (job) => {
    console.info(`[worker:${name}] job completed`, job.id);
  });

  workers.push(worker);
  return worker;
}

async function main() {
  await registerSchedulers();

  startWorker<EmailInboundJob>(
    QUEUE_NAMES.emailInbound,
    async (data) => processEmailInbound(data),
    5,
  );
  startWorker<EmailOutboundJob>(
    QUEUE_NAMES.emailOutbound,
    async (data, meta) => processEmailOutbound(data, meta),
    5,
  );
  startWorker<SlaScanJob>(
    QUEUE_NAMES.slaScan,
    async (data) => processSlaScan(data),
    1,
  );
  startWorker<AutomationJob>(
    QUEUE_NAMES.automation,
    async (data) => processAutomation(data),
    2,
  );
  startWorker<CleanupJob>(
    QUEUE_NAMES.cleanup,
    async (data) => processCleanup(data),
    1,
  );

  console.info("[worker] listening for jobs");
}

async function shutdown(signal: string) {
  console.info(`[worker] shutting down on ${signal}`);
  await Promise.all(workers.map((worker) => worker.close()));
  await bullRedis.quit();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

main().catch((error) => {
  console.error("[worker] fatal", error);
  process.exit(1);
});
