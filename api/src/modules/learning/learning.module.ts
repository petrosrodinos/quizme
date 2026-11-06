import { BadRequestException, Body, Controller, Get, Global, HttpCode, Injectable, Module, NotFoundException, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { randomUUID } from 'crypto';
import { Prisma, RecallMode } from 'generated/prisma';
import { z } from 'zod';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { DomainEvents, RecallEvaluatedEvent } from '@/shared/events/domain-events';
import { DomainEventsService } from '@/shared/events/domain-events.service';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { recordStudySession } from '@/shared/utils/study-session.utils';
import { AiService } from '../ai/ai.service';
import { TextAction, TextActions, toSourceRef } from '../ai/ai.types';
import { KnowledgeService } from '../knowledge/knowledge.service';

export class TextActionDto {
    @ApiProperty({ enum: TextActions }) @IsIn(TextActions as unknown as string[]) action: TextAction;
    @ApiProperty() @IsString() @MinLength(1) @MaxLength(8000) text: string;
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() document_id?: string;
    @ApiProperty({ required: false, example: 'Greek' }) @IsOptional() @IsString() @MaxLength(40) language?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(200) compare_with?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(1000) question?: string;
}

export class WordLookupDto {
    @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) word: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(2000) context?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(40) language?: string;
}

export class EvaluateRecallDto {
    @ApiProperty({ enum: RecallMode }) @IsIn(['ACTIVE_RECALL', 'TEACH_BACK']) mode: RecallMode;
    @ApiProperty({ required: false, description: 'Prompt id returned by GET /recall/prompts' }) @IsOptional() @IsString() @MaxLength(80) prompt_id?: string;
    @ApiProperty({ required: false, description: 'Free-form concept/prompt when not using a generated prompt' }) @IsOptional() @IsString() @MaxLength(500) prompt?: string;
    @ApiProperty() @IsString() @MinLength(1) @MaxLength(8000) answer: string;
    @ApiProperty({ required: false }) @IsOptional() @IsUUID() topic_id?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(3600) time_spent_sec?: number;
}

const RecallPromptQuerySchema = z.object({
    mode: z.enum(['ACTIVE_RECALL', 'TEACH_BACK']).optional().default('ACTIVE_RECALL'),
    topic_id: z.string().uuid().optional(),
    count: z.coerce.number().int().min(1).max(10).optional().default(5),
});
type RecallPromptQuery = z.infer<typeof RecallPromptQuerySchema>;

interface StoredPrompt {
    user_id: string;
    project_id: string;
    prompt: string;
    reference: string;
    key_concepts: string[];
    chunk_id: string | null;
    topic_id: string | null;
    mode: RecallMode;
}

/** Contextual AI actions on selected text/words, active recall and "teach it back" evaluation. */
@Injectable()
export class LearningService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly ai: AiService,
        private readonly knowledge: KnowledgeService,
        private readonly events: DomainEventsService,
    ) { }

    async textAction(userId: string, projectId: string, dto: TextActionDto) {
        await this.access.assert(userId, projectId, 'STUDY');
        if (dto.action === 'compare' && !dto.compare_with) throw new BadRequestException('Tell me what to compare with');
        if (dto.action === 'ask' && !dto.question) throw new BadRequestException('Type your question');
        const context = await this.knowledge.retrieve([projectId], dto.text.slice(0, 1500), { k: 3, userId, documentIds: dto.document_id ? [dto.document_id] : undefined });
        return this.ai.textAction({ userId, projectId, task: `text_${dto.action}` }, dto.action, dto.text, context, {
            language: dto.language,
            compare_with: dto.compare_with,
            question: dto.question,
        });
    }

    async word(userId: string, projectId: string, dto: WordLookupDto) {
        await this.access.assert(userId, projectId, 'STUDY');
        return this.ai.wordLookup({ userId, projectId, task: 'word_lookup' }, dto.word.trim(), dto.context ?? dto.word, dto.language);
    }

    async recallPrompts(userId: string, projectId: string, q: RecallPromptQuery) {
        await this.access.assert(userId, projectId, 'STUDY');
        const passages = await this.knowledge.samplePassages(projectId, { count: Math.min(8, q.count + 2), topicIds: q.topic_id ? [q.topic_id] : undefined, userId });
        if (!passages.length) throw new NotFoundException('No processed study material available yet');
        const prompts = await this.ai.recallPrompts({ userId, projectId, task: 'recall_prompts' }, passages, q.count, q.mode);
        const expires = new Date(Date.now() + 2 * 86_400_000);
        const out: { prompt_id: string; prompt: string; topic_id: string | null; source: ReturnType<typeof toSourceRef> | null }[] = [];
        for (const p of prompts.slice(0, q.count)) {
            const passage = passages[Math.max(0, Math.min(passages.length - 1, (p.source_index ?? 1) - 1))];
            const id = randomUUID();
            const stored: StoredPrompt = {
                user_id: userId,
                project_id: projectId,
                prompt: p.prompt,
                reference: p.reference_answer,
                key_concepts: p.key_concepts,
                chunk_id: passage?.chunkId ?? null,
                topic_id: passage?.topicId ?? q.topic_id ?? null,
                mode: q.mode,
            };
            // Reference answers stay server-side (never sent to the client before grading).
            await this.prisma.aiCache.create({ data: { key: `recall:${id}`, task: 'recall_prompt', response: stored as unknown as Prisma.InputJsonValue, expires_at: expires } });
            out.push({ prompt_id: id, prompt: p.prompt, topic_id: stored.topic_id, source: passage ? toSourceRef(passage) : null });
        }
        return out;
    }

    async evaluate(userId: string, projectId: string, dto: EvaluateRecallDto) {
        await this.access.assert(userId, projectId, 'STUDY');
        let stored: StoredPrompt | null = null;
        if (dto.prompt_id) {
            const row = await this.prisma.aiCache.findUnique({ where: { key: `recall:${dto.prompt_id}` } });
            stored = (row?.response as unknown as StoredPrompt) ?? null;
            if (!stored || stored.user_id !== userId || stored.project_id !== projectId) throw new NotFoundException('Prompt expired — generate a new one');
        }
        const prompt = stored?.prompt ?? dto.prompt;
        if (!prompt) throw new BadRequestException('Provide a prompt or prompt_id');
        const passages = stored?.chunk_id ? await this.knowledge.passagesByIds([stored.chunk_id]) : await this.knowledge.retrieve([projectId], prompt, { k: 4, userId });
        const evaluation = await this.ai.evaluateAnswer(
            { userId, projectId, task: dto.mode === 'TEACH_BACK' ? 'teach_back_eval' : 'recall_eval' },
            { prompt, reference: stored?.reference, keyConcepts: stored?.key_concepts, answer: dto.answer, passages, mode: dto.mode },
        );
        const attempt = await this.prisma.recallAttempt.create({
            data: {
                user_id: userId,
                project_id: projectId,
                topic_id: dto.topic_id ?? stored?.topic_id ?? null,
                mode: dto.mode,
                prompt,
                answer: dto.answer,
                evaluation: evaluation as unknown as Prisma.InputJsonValue,
                score: evaluation.score,
            },
        });
        this.events.emit<RecallEvaluatedEvent>(DomainEvents.RECALL_EVALUATED, { userId, projectId, recallId: attempt.id, mode: dto.mode, score: evaluation.score });
        this.events.emit(DomainEvents.STUDY_TIME_LOGGED, { userId, projectId, seconds: dto.time_spent_sec ?? 120 });
        await recordStudySession(this.prisma, userId, projectId, dto.mode === 'TEACH_BACK' ? 'TEACH_BACK' : 'RECALL', dto.time_spent_sec ?? 120).catch(() => undefined);
        return { id: attempt.id, prompt, evaluation, sources: passages.map((p) => toSourceRef(p)) };
    }

    async history(userId: string, projectId: string) {
        await this.access.assert(userId, projectId, 'VIEW');
        return this.prisma.recallAttempt.findMany({ where: { user_id: userId, project_id: projectId }, orderBy: { created_at: 'desc' }, take: 50 });
    }
}

@ApiTags('Learning')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('projects/:projectId')
export class LearningController {
    constructor(private readonly learning: LearningService) { }

    @Post('ai/text-action')
    @HttpCode(200)
    @Throttle({ default: { limit: 30, ttl: 60_000 } })
    @ApiOperation({ summary: 'Contextual AI action on selected text (explain, simplify, translate, quiz-ready analysis...)' })
    textAction(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: TextActionDto) {
        return this.learning.textAction(userId, projectId, dto);
    }

    @Post('ai/word')
    @HttpCode(200)
    @Throttle({ default: { limit: 40, ttl: 60_000 } })
    @ApiOperation({ summary: 'Word-level lookup: definition, contextual meaning, pronunciation, translation, example, related terms' })
    word(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: WordLookupDto) {
        return this.learning.word(userId, projectId, dto);
    }

    @Get('recall/prompts')
    @Throttle({ default: { limit: 15, ttl: 60_000 } })
    @ApiOperation({ summary: 'Generate active-recall / teach-back prompts' })
    prompts(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Query(new ZodValidationPipe(RecallPromptQuerySchema)) q: RecallPromptQuery) {
        return this.learning.recallPrompts(userId, projectId, q);
    }

    @Post('recall/evaluate')
    @HttpCode(200)
    @Throttle({ default: { limit: 30, ttl: 60_000 } })
    @ApiOperation({ summary: 'Evaluate an explanation (accuracy, completeness, clarity, missing concepts, misconceptions)' })
    evaluate(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: EvaluateRecallDto) {
        return this.learning.evaluate(userId, projectId, dto);
    }

    @Get('recall/history')
    history(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
        return this.learning.history(userId, projectId);
    }
}

@Global()
@Module({ controllers: [LearningController], providers: [LearningService], exports: [LearningService] })
export class LearningModule { }
