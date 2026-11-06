import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hostname } from 'os';
import { randomUUID } from 'crypto';
import { Job, JobStatus, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';

export const JobTypes = {
    PROCESS_DOCUMENT: 'document.process',
    BUILD_TOPICS: 'topics.build',
    GENERATE_QUIZ: 'quiz.generate',
    GENERATE_FLASHCARDS: 'flashcards.generate',
    GENERATE_SUMMARY: 'summary.generate',
    DAILY_MAINTENANCE: 'maintenance.daily',
} as const;

export type JobType = (typeof JobTypes)[keyof typeof JobTypes];

export interface JobContext {
    job: Job;
    /** Report progress (0-100) and an optional status message. */
    progress: (value: number, message?: string) => Promise<void>;
}

export type JobHandler = (payload: any, ctx: JobContext) => Promise<unknown>;

export interface EnqueueOptions {
    userId?: string;
    projectId?: string;
    resourceId?: string;
    dedupeKey?: string;
    priority?: number;
    maxAttempts?: number;
    runAt?: Date;
}

/**
 * Durable Postgres-backed background job queue. Heavy work (document processing, AI generation)
 * never runs inside the HTTP request. Jobs are claimed atomically with a conditional update so
 * multiple API instances can run workers concurrently. Failures retry with exponential backoff.
 */
@Injectable()
export class JobsService implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(JobsService.name);
    private readonly handlers = new Map<string, JobHandler>();
    private readonly workerId = `${hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`;
    private readonly concurrency: number;
    private readonly enabled: boolean;
    private running = 0;
    private timer: NodeJS.Timeout | null = null;
    private stopped = false;
    private listeners: Array<(job: Job) => void> = [];

    constructor(
        private readonly prisma: PrismaService,
        config: ConfigService,
    ) {
        this.concurrency = Number(config.get('WORKER_CONCURRENCY') ?? 2);
        this.enabled = String(config.get('WORKER_ENABLED') ?? 'true') !== 'false';
    }

    register(type: string, handler: JobHandler) {
        this.handlers.set(type, handler);
    }

    /** Subscribe to job lifecycle updates (used to push realtime status to clients). */
    onUpdate(listener: (job: Job) => void) {
        this.listeners.push(listener);
    }

    async enqueue(type: string, payload: Record<string, unknown>, options: EnqueueOptions = {}): Promise<Job> {
        if (options.dedupeKey) {
            const existing = await this.prisma.job.findFirst({
                where: { dedupe_key: options.dedupeKey, status: { in: [JobStatus.PENDING, JobStatus.RUNNING] } },
            });
            if (existing) return existing;
        }
        const job = await this.prisma.job.create({
            data: {
                type,
                payload: payload as Prisma.InputJsonValue,
                user_id: options.userId,
                project_id: options.projectId,
                resource_id: options.resourceId,
                dedupe_key: options.dedupeKey,
                priority: options.priority ?? 0,
                max_attempts: options.maxAttempts ?? 3,
                run_at: options.runAt ?? new Date(),
            },
        });
        setImmediate(() => this.tick());
        return job;
    }

    async get(id: string) {
        return this.prisma.job.findUnique({ where: { id } });
    }

    onApplicationBootstrap() {
        if (!this.enabled) {
            this.logger.warn('Background worker disabled (WORKER_ENABLED=false)');
            return;
        }
        // Recover jobs left RUNNING by a crashed worker.
        void this.prisma.job
            .updateMany({
                where: { status: JobStatus.RUNNING, locked_at: { lt: new Date(Date.now() - 15 * 60_000) } },
                data: { status: JobStatus.PENDING, locked_at: null, locked_by: null },
            })
            .catch(() => undefined);
        this.timer = setInterval(() => this.tick(), 1500);
        this.logger.log(`Worker ${this.workerId} started (concurrency ${this.concurrency})`);
    }

    onModuleDestroy() {
        this.stopped = true;
        if (this.timer) clearInterval(this.timer);
    }

    private async tick() {
        if (!this.enabled || this.stopped) return;
        while (this.running < this.concurrency) {
            const job = await this.claim().catch((e) => {
                this.logger.error(`Claim failed: ${e?.message}`);
                return null;
            });
            if (!job) return;
            this.running++;
            void this.execute(job).finally(() => {
                this.running--;
                setImmediate(() => this.tick());
            });
        }
    }

    private async claim(): Promise<Job | null> {
        for (let i = 0; i < 3; i++) {
            const candidate = await this.prisma.job.findFirst({
                where: { status: JobStatus.PENDING, run_at: { lte: new Date() }, type: { in: [...this.handlers.keys()] } },
                orderBy: [{ priority: 'desc' }, { run_at: 'asc' }],
                select: { id: true },
            });
            if (!candidate) return null;
            const claimed = await this.prisma.job.updateMany({
                where: { id: candidate.id, status: JobStatus.PENDING },
                data: { status: JobStatus.RUNNING, locked_at: new Date(), locked_by: this.workerId, attempts: { increment: 1 } },
            });
            if (claimed.count === 1) return this.prisma.job.findUnique({ where: { id: candidate.id } });
        }
        return null;
    }

    private async execute(job: Job) {
        const handler = this.handlers.get(job.type);
        const started = Date.now();
        try {
            this.notify(job);
            const result = await handler(job.payload, {
                job,
                progress: async (value, message) => {
                    const updated = await this.prisma.job.update({
                        where: { id: job.id },
                        data: { result: { progress: value, message: message ?? null } as Prisma.InputJsonValue },
                    });
                    this.notify(updated);
                },
            });
            const done = await this.prisma.job.update({
                where: { id: job.id },
                data: {
                    status: JobStatus.COMPLETED,
                    completed_at: new Date(),
                    result: (result ?? { ok: true }) as Prisma.InputJsonValue,
                    last_error: null,
                },
            });
            this.notify(done);
            this.logger.log(`Job ${job.type} ${job.id} completed in ${Date.now() - started}ms`);
        } catch (error) {
            const message = String(error?.message ?? error).slice(0, 2000);
            const retry = job.attempts < job.max_attempts && !error?.permanent;
            const backoffMs = Math.min(60_000 * 10, 5_000 * 2 ** (job.attempts - 1));
            const failed = await this.prisma.job.update({
                where: { id: job.id },
                data: {
                    status: retry ? JobStatus.PENDING : JobStatus.FAILED,
                    last_error: message,
                    locked_at: null,
                    locked_by: null,
                    run_at: retry ? new Date(Date.now() + backoffMs) : undefined,
                },
            });
            this.notify(failed);
            this.logger.error(`Job ${job.type} ${job.id} failed (attempt ${job.attempts}/${job.max_attempts}): ${message}`);
        }
    }

    private notify(job: Job) {
        for (const listener of this.listeners) {
            try {
                listener(job);
            } catch {
                /* listeners must not break the worker */
            }
        }
    }
}

/** Error that should not be retried (e.g. invalid file). */
export class PermanentJobError extends Error {
    readonly permanent = true;
}
