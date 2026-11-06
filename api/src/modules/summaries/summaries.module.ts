import { Body, Controller, Delete, Get, Global, Injectable, Module, NotFoundException, OnModuleInit, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { GenerationStatus, SummaryLevel } from 'generated/prisma';
import { z } from 'zod';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { JobsService, JobTypes, PermanentJobError } from '@/core/jobs/jobs.service';
import { RealtimeEvents, RealtimeService } from '@/core/realtime/realtime.service';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { sha256 } from '@/shared/utils/hash.utils';
import { AiService } from '../ai/ai.service';
import { KnowledgeService } from '../knowledge/knowledge.service';

export class CreateSummaryDto {
    @ApiProperty({ enum: SummaryLevel }) @IsEnum(SummaryLevel) level: SummaryLevel;
    @ApiProperty({ required: false, description: 'Summarize one document; omit for the whole project' }) @IsOptional() @IsUUID() document_id?: string;
    @ApiProperty({ required: false, description: 'Force regeneration even if a cached summary exists' }) @IsOptional() @IsBoolean() force?: boolean;
}

const SummaryQuerySchema = z.object({ document_id: z.string().uuid().optional() });

/**
 * Multi-level summaries (1-minute, 5-minute, detailed, cheat sheet, study guide), generated in the background
 * with hierarchical map/reduce, cached per source fingerprint so unchanged material is never re-summarized.
 */
@Injectable()
export class SummariesService implements OnModuleInit {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly jobs: JobsService,
        private readonly realtime: RealtimeService,
        private readonly ai: AiService,
        private readonly knowledge: KnowledgeService,
    ) { }

    onModuleInit() {
        this.jobs.register(JobTypes.GENERATE_SUMMARY, (payload) => this.run(payload.summaryId));
    }

    private async fingerprint(projectId: string, documentId: string | undefined, level: SummaryLevel) {
        const chunks = await this.prisma.documentChunk.findMany({
            where: documentId ? { document_id: documentId } : { project_id: projectId },
            select: { content_hash: true },
            orderBy: [{ document_id: 'asc' }, { chunk_index: 'asc' }],
        });
        return { hash: sha256(`${level}:${documentId ?? projectId}:${chunks.map((c) => c.content_hash).join(',')}`), count: chunks.length };
    }

    async create(userId: string, projectId: string, dto: CreateSummaryDto) {
        await this.access.assert(userId, projectId, 'STUDY');
        if (dto.document_id) {
            const doc = await this.prisma.studyDocument.findFirst({ where: { id: dto.document_id, project_id: projectId } });
            if (!doc) throw new NotFoundException('Document not found');
        }
        const fp = await this.fingerprint(projectId, dto.document_id, dto.level);
        if (!fp.count) throw new NotFoundException('No processed material to summarize yet');
        if (!dto.force) {
            const cached = await this.prisma.summary.findFirst({
                where: { project_id: projectId, document_id: dto.document_id ?? null, level: dto.level, source_hash: fp.hash, status: { in: [GenerationStatus.READY, GenerationStatus.PENDING, GenerationStatus.GENERATING] } },
                orderBy: { created_at: 'desc' },
            });
            if (cached) return { ...cached, cached: true };
        }
        const summary = await this.prisma.summary.create({
            data: { project_id: projectId, document_id: dto.document_id ?? null, level: dto.level, source_hash: fp.hash, created_by: userId },
        });
        await this.jobs.enqueue(JobTypes.GENERATE_SUMMARY, { summaryId: summary.id }, { userId, projectId, resourceId: summary.id, priority: 4, maxAttempts: 2 });
        return { ...summary, cached: false };
    }

    private async run(summaryId: string) {
        const s = await this.prisma.summary.findUnique({ where: { id: summaryId }, include: { project: { select: { title: true } }, document: { select: { filename: true } } } });
        if (!s) return { skipped: true };
        const push = (status: GenerationStatus, error?: string) =>
            this.realtime.toUser(s.created_by, RealtimeEvents.GENERATION_STATUS, { kind: 'summary', id: s.id, project_id: s.project_id, status, error: error ?? null });
        await this.prisma.summary.update({ where: { id: s.id }, data: { status: GenerationStatus.GENERATING } });
        push(GenerationStatus.GENERATING);
        try {
            const passages = s.document_id ? await this.knowledge.documentPassages(s.document_id) : await this.knowledge.projectPassages(s.project_id);
            if (!passages.length) throw new PermanentJobError('No processed material to summarize');
            const title = s.document?.filename ?? s.project.title;
            const res = await this.ai.summarize({ userId: s.created_by, projectId: s.project_id, task: `summary_${s.level.toLowerCase()}` }, s.level, title, passages);
            const direct = passages.reduce((n, p) => n + p.content.length, 0) <= 40_000;
            let content = res.content;
            if (direct) {
                const cited = [...new Set([...content.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))].filter((n) => n >= 1 && n <= passages.length).sort((a, b) => a - b);
                if (cited.length) {
                    content += `\n\n---\n**Sources**\n${cited
                        .map((n) => {
                            const p = passages[n - 1];
                            return `[${n}] ${p.documentTitle}${p.section ? ` · ${p.section}` : ''}${p.pageStart ? ` · p.${p.pageStart}` : ''}`;
                        })
                        .join('  \n')}`;
                }
            } else content = content.replace(/\s?\[\d+\]/g, '');
            await this.prisma.summary.update({ where: { id: s.id }, data: { status: GenerationStatus.READY, content, model: res.model, error_message: null } });
            push(GenerationStatus.READY);
            return { length: content.length };
        } catch (error) {
            const message = error?.response?.message ?? error?.message ?? 'Summary generation failed';
            await this.prisma.summary.update({ where: { id: s.id }, data: { status: GenerationStatus.FAILED, error_message: String(message).slice(0, 500) } });
            push(GenerationStatus.FAILED, String(message));
            throw new PermanentJobError(String(message));
        }
    }

    async list(userId: string, projectId: string, documentId?: string) {
        await this.access.assert(userId, projectId, 'VIEW');
        return this.prisma.summary.findMany({
            where: { project_id: projectId, ...(documentId ? { document_id: documentId } : {}) },
            orderBy: { created_at: 'desc' },
            include: { document: { select: { id: true, filename: true } } },
            take: 100,
        });
    }

    async get(userId: string, id: string) {
        return this.access.assertResource(userId, await this.prisma.summary.findUnique({ where: { id }, include: { document: { select: { id: true, filename: true } } } }), 'VIEW', 'Summary not found');
    }

    async remove(userId: string, id: string) {
        await this.access.assertResource(userId, await this.prisma.summary.findUnique({ where: { id } }), 'CONTRIBUTE', 'Summary not found');
        await this.prisma.summary.delete({ where: { id } });
        return { success: true };
    }
}

@ApiTags('Summaries')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller()
export class SummariesController {
    constructor(private readonly summaries: SummariesService) { }

    @Post('projects/:projectId/summaries')
    @ApiOperation({ summary: 'Generate (or reuse cached) summary at a given level' })
    create(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateSummaryDto) {
        return this.summaries.create(userId, projectId, dto);
    }

    @Get('projects/:projectId/summaries')
    list(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Query(new ZodValidationPipe(SummaryQuerySchema)) q: { document_id?: string }) {
        return this.summaries.list(userId, projectId, q.document_id);
    }

    @Get('summaries/:id')
    get(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.summaries.get(userId, id);
    }

    @Delete('summaries/:id')
    remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.summaries.remove(userId, id);
    }
}

@Global()
@Module({ controllers: [SummariesController], providers: [SummariesService], exports: [SummariesService] })
export class SummariesModule { }
