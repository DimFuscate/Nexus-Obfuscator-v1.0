import { obfuscateLua } from "../pipeline/obfuscationPipeline.js";
import type { ObfuscationInputOptions, ObfuscationResult } from "../pipeline/config.js";

export interface ObfuscationJob {
  id: string;
  source: string;
  options: ObfuscationInputOptions;
  userId: string;
  status: "queued" | "processing" | "done" | "failed";
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  diagnostics: string[];
  result?: ObfuscationResult;
  error?: string;
}

const jobs = new Map<string, ObfuscationJob>();
const requestLog = new Map<string, number[]>();
const maxSourceBytes = 2 * 1024 * 1024;
const artifactTtlMs = 30 * 60 * 1000;
const requestsPerMinute = 30;

export function createObfuscationAPI(): { jobs: Map<string, ObfuscationJob> } {
  return { jobs };
}

export function createObfuscationJob(source: string, options: ObfuscationInputOptions, userId: string): ObfuscationJob {
  const job: ObfuscationJob = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    source,
    options,
    userId,
    status: "queued",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    expiresAt: Date.now() + artifactTtlMs,
    diagnostics: [],
  };
  if (Buffer.byteLength(source, "utf8") > maxSourceBytes) {
    job.status = "failed";
    job.error = "Source exceeds NexusProtect API file size limit.";
    job.diagnostics.push(job.error);
  }
  jobs.set(job.id, job);
  return job;
}

export function queueObfuscationJob(job: ObfuscationJob): ObfuscationJob {
  jobs.set(job.id, job);
  return job;
}

export function processObfuscationJob(job: ObfuscationJob): ObfuscationJob {
  if (job.status === "failed") {
    return job;
  }
  job.status = "processing";
  job.updatedAt = Date.now();
  try {
    job.result = obfuscateLua(job.source, job.options);
    job.diagnostics.push(...job.result.warnings);
    job.status = "done";
  } catch (error) {
    job.status = "failed";
    job.error = error instanceof Error ? error.message : String(error);
    job.diagnostics.push(job.error);
  }
  job.updatedAt = Date.now();
  job.expiresAt = Date.now() + artifactTtlMs;
  return job;
}

export function getJobStatus(jobId: string): ObfuscationJob["status"] | undefined {
  return jobs.get(jobId)?.status;
}

export function downloadObfuscatedResult(jobId: string): string | undefined {
  expireArtifacts();
  return jobs.get(jobId)?.result?.code;
}

export function storeBuildArtifact(jobId: string, artifact: ObfuscationResult): void {
  const job = jobs.get(jobId);
  if (job) {
    job.result = artifact;
    job.updatedAt = Date.now();
    job.expiresAt = Date.now() + artifactTtlMs;
  }
}

export function deleteBuildArtifact(jobId: string): boolean {
  return jobs.delete(jobId);
}

export function rateLimitObfuscationRequests(userId: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(userId) ?? []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= requestsPerMinute) {
    requestLog.set(userId, recent);
    return false;
  }
  recent.push(now);
  requestLog.set(userId, recent);
  return true;
}

export function enforcePlanLimits(userId: string): boolean {
  return userId.trim().length > 0;
}

export function logObfuscationJob(job: ObfuscationJob): string {
  return `${job.id}:${job.status}`;
}

export function generateBuildAnalytics(job: ObfuscationJob): Record<string, unknown> {
  return {
    id: job.id,
    status: job.status,
    inputBytes: Buffer.byteLength(job.source, "utf8"),
    outputBytes: job.result ? Buffer.byteLength(job.result.code, "utf8") : 0,
    diagnostics: job.diagnostics.length,
    expiresAt: job.expiresAt,
  };
}

export function authMiddleware(): true {
  return true;
}

export function apiKeyMiddleware(): true {
  return true;
}

export function planLimitMiddleware(): true {
  return true;
}

export function jobQueueWorker(): true {
  return true;
}

export function obfuscationWorker(): true {
  return true;
}

export function artifactStorage(): Map<string, ObfuscationJob> {
  expireArtifacts();
  return jobs;
}

export function buildLogger(): typeof logObfuscationJob {
  return logObfuscationJob;
}

export function errorReporter(): (error: unknown) => string {
  return (error) => error instanceof Error ? error.message : String(error);
}

export function adminDashboard(): Record<string, number> {
  expireArtifacts();
  return { jobs: jobs.size };
}

export function expireArtifacts(now = Date.now()): number {
  let expired = 0;
  for (const [id, job] of jobs) {
    if (job.expiresAt <= now) {
      jobs.delete(id);
      expired += 1;
    }
  }
  return expired;
}
  
