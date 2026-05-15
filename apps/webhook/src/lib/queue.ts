import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { processWebhookJob } from "../handlers";

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // required by BullMQ
  tls: process.env.REDIS_URL?.startsWith("rediss://") ? {} : undefined,
});

export const webhookQueue = new Queue("webhook-events", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 100 },
  },
});

// ── Worker ─────────────────────────────────────
export function startWorker() {
  const worker = new Worker(
    "webhook-events",
    async (job: Job) => {
      await processWebhookJob(job.data);
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`✅ Job ${job.id} (${job.data.field}) completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  console.log("🔧 BullMQ worker started");
  return worker;
}

export { connection };
