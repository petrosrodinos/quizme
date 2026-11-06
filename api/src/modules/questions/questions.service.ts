import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ContentOrigin, Prisma, Question, QuestionType } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { paginate } from '@/shared/utils/pagination.utils';
import { contentTokens } from '@/integrations/ai/local/nlp.utils';
import { AiService } from '../ai/ai.service';
import { Passage, toSourceRef } from '../ai/ai.types';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { CreateQuestionDto, QuestionQueryType, UpdateQuestionDto } from './dto/questions.dto';
import { answerIsEmpty, gradeObjective, normalizeGenerated, questionHash, toClientPayload } from './questions.utils';

export interface GenerateOptions {
    count: number;
    types: QuestionType[];
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed' | 'adaptive';
    targetDifficulty?: number;
    documentIds?: string[];
    topicIds?: string[];
    focusConcepts?: string[];
    passages?: Passage[];
    instructions?: string;
}

export interface GradeResult {
    isCorrect: boolean;
    score: number;
    correctAnswer: unknown;
    feedback: Record<string, unknown> | null;
}

const DIFFICULTY_TEXT: Record<string, string> = {
    easy: 'easy (1-2): direct recall of key facts and definitions',
    medium: 'medium (2-3): understanding and relationships',
    hard: 'hard (4-5): application, analysis and synthesis',
    mixed: 'a mix from 1 to 5',
};

@Injectable()
export class QuestionsService {
    private readonly logger = new Logger(QuestionsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly ai: AiService,
        private readonly knowledge: KnowledgeService,
    ) { }

    /** Full question for editors (includes answers). */
    serialize(q: Question) {
        const { content_hash: _h, original: _o, ...rest } = q;
        return rest;
    }

    /** Safe question for a quiz taker (no answers / explanations). */
    toClient(q: Question) {
        return {
            id: q.id,
            type: q.type,
            prompt: q.prompt,
            difficulty: q.difficulty,
            concept: q.concept,
            topic_id: q.topic_id,
            source_ref: q.source_ref,
            payload: toClientPayload(q),
        };
    }

    // ── Generation (used by quizzes, review, exams, notes, selection) ──

    async generate(userId: string, projectId: string, opts: GenerateOptions): Promise<string[]> {
        const passages =
            opts.passages ??
            (await this.knowledge.samplePassages(projectId, {
                count: Math.min(24, Math.max(4, Math.ceil(opts.count * 0.8))),
                documentIds: opts.documentIds,
                topicIds: opts.topicIds,
                concepts: opts.focusConcepts,
                userId,
                preferUnused: 'questions',
            }));
        if (!passages.length) throw new BadRequestException('No processed study material available yet. Upload documents and wait for processing to finish.');

        const recent = await this.prisma.question.findMany({ where: { project_id: projectId }, orderBy: { created_at: 'desc' }, take: 60, select: { prompt: true } });
        const avoid = recent.map((r) => r.prompt);
        const difficultyText =
            opts.difficulty === 'adaptive'
                ? `around ${(opts.targetDifficulty ?? 2.5).toFixed(1)} on the 1-5 scale (adaptive to the learner)`
                : DIFFICULTY_TEXT[opts.difficulty] ?? DIFFICULTY_TEXT.mixed;

        // Map-style batching: each call sees a small, focused passage set (never the whole document).
        const BATCH_Q = 8;
        const batches: { passages: Passage[]; count: number }[] = [];
        let remaining = Math.ceil(opts.count * 1.25); // over-generate: some items fail validation/dedupe
        let offset = 0;
        while (remaining > 0) {
            const count = Math.min(BATCH_Q, remaining);
            const slice = passages.slice(offset, offset + 6);
            batches.push({ passages: slice.length ? slice : passages.slice(0, 6), count });
            offset = (offset + 6) % Math.max(passages.length, 1);
            remaining -= count;
        }
        const created: string[] = [];
        const seenTokens: Set<string>[] = avoid.map((p) => new Set(contentTokens(p)));
        const model = this.ai.providerInfo.fast_model;
        for (let i = 0; i < batches.length && created.length < opts.count; i += 3) {
            const results = await Promise.allSettled(
                batches.slice(i, i + 3).map((b) =>
                    this.ai.generateQuestions(
                        { userId, projectId, task: 'question_generation' },
                        { passages: b.passages, count: b.count, types: opts.types, difficulty: difficultyText, focusConcepts: opts.focusConcepts, avoid, instructions: opts.instructions },
                    ).then((qs) => ({ qs, passages: b.passages })),
                ),
            );
            const failures = results.filter((r) => r.status === 'rejected');
            if (failures.length === results.length && !created.length) throw (failures[0] as PromiseRejectedResult).reason;
            for (const r of results) {
                if (r.status !== 'fulfilled') continue;
                for (const g of r.value.qs) {
                    if (created.length >= opts.count) break;
                    if (!opts.types.includes(g.type as QuestionType)) continue;
                    const n = normalizeGenerated(g, r.value.passages);
                    if (!n) continue;
                    const tokens = new Set(contentTokens(n.prompt));
                    const nearDuplicate = seenTokens.some((s) => {
                        const inter = [...tokens].filter((t) => s.has(t)).length;
                        return inter / Math.max(1, Math.min(tokens.size, s.size)) > 0.85 && Math.abs(tokens.size - s.size) <= 3;
                    });
                    if (nearDuplicate) continue;
                    const passage = r.value.passages[n.passageIndex];
                    try {
                        const q = await this.prisma.question.create({
                            data: {
                                project_id: projectId,
                                topic_id: passage.topicId,
                                document_id: passage.documentId,
                                chunk_id: passage.chunkId,
                                type: n.type,
                                difficulty: n.difficulty,
                                prompt: n.prompt,
                                data: n.data as Prisma.InputJsonValue,
                                explanation: n.explanation,
                                concept: n.concept,
                                source_ref: toSourceRef(passage, n.quote) as unknown as Prisma.InputJsonValue,
                                tags: [],
                                origin: ContentOrigin.AI,
                                generation_model: model,
                                generated_at: new Date(),
                                content_hash: questionHash(n.type, n.prompt),
                                original: { prompt: n.prompt, data: n.data, explanation: n.explanation, difficulty: n.difficulty } as Prisma.InputJsonValue,
                                created_by: userId,
                            },
                        });
                        created.push(q.id);
                        seenTokens.push(tokens);
                    } catch (error) {
                        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
                    }
                }
            }
        }
        if (!created.length) throw new BadRequestException('The AI could not produce valid questions from this material. Try different settings.');
        return created;
    }

    // ── Grading ──

    async grade(userId: string, question: Question, answer: any, projectId: string): Promise<GradeResult> {
        if (answerIsEmpty(question.type, answer)) {
            const objective = gradeObjective(question.type, question.data, {}, question.prompt);
            return { isCorrect: false, score: 0, correctAnswer: objective?.correctAnswer ?? null, feedback: { skipped: true } };
        }
        if (question.type === QuestionType.FREE_TEXT) {
            const data = question.data as { expected_answer: string; key_concepts: string[] };
            const ref = question.source_ref as { chunk_id?: string } | null;
            const passages = ref?.chunk_id ? await this.knowledge.passagesByIds([ref.chunk_id]) : await this.knowledge.retrieve([projectId], question.prompt, { k: 3, userId });
            const evaluation = await this.ai.evaluateAnswer(
                { userId, projectId, task: 'answer_evaluation' },
                { prompt: question.prompt, reference: data.expected_answer, keyConcepts: data.key_concepts, answer: String(answer?.text ?? ''), passages, mode: 'FREE_TEXT' },
            );
            return {
                isCorrect: evaluation.score >= 70,
                score: Number((evaluation.score / 100).toFixed(3)),
                correctAnswer: { text: data.expected_answer },
                feedback: evaluation as unknown as Record<string, unknown>,
            };
        }
        const g = gradeObjective(question.type, question.data, answer, question.prompt)!;
        return { ...g, feedback: null };
    }

    // ── Question bank ──

    async list(userId: string, projectId: string, q: QuestionQueryType) {
        await this.access.assert(userId, projectId, 'VIEW');
        const where: Prisma.QuestionWhereInput = {
            project_id: projectId,
            archived_at: null,
            in_bank: true,
            ...(q.type ? { type: q.type } : {}),
            ...(q.difficulty ? { difficulty: q.difficulty } : {}),
            ...(q.topic_id ? { topic_id: q.topic_id } : {}),
            ...(q.tag ? { tags: { has: q.tag } } : {}),
            ...(q.origin ? { origin: q.origin } : {}),
            ...(q.search ? { OR: [{ prompt: { contains: q.search, mode: 'insensitive' } }, { concept: { contains: q.search, mode: 'insensitive' } }] } : {}),
            ...(q.missed ? { responses: { some: { user_id: userId, is_correct: false } } } : {}),
        };
        const [items, total] = await Promise.all([
            this.prisma.question.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (q.page - 1) * q.limit,
                take: q.limit,
                include: { topic: { select: { id: true, name: true } }, _count: { select: { responses: true } } },
            }),
            this.prisma.question.count({ where }),
        ]);
        const stats = items.length
            ? await this.prisma.questionResponse.groupBy({
                by: ['question_id', 'is_correct'],
                where: { question_id: { in: items.map((i) => i.id) }, user_id: userId },
                _count: { _all: true },
            })
            : [];
        return paginate(
            items.map((i) => {
                const mine = stats.filter((s) => s.question_id === i.id);
                const correct = mine.find((s) => s.is_correct)?._count._all ?? 0;
                const wrong = mine.find((s) => !s.is_correct)?._count._all ?? 0;
                const { content_hash: _h, original: _o, _count, ...rest } = i;
                return { ...rest, total_responses: _count.responses, my_stats: { correct, incorrect: wrong } };
            }),
            total,
            q.page,
            q.limit,
        );
    }

    async get(userId: string, id: string) {
        const q = await this.prisma.question.findUnique({ where: { id }, include: { versions: { orderBy: { version: 'desc' }, take: 20 }, topic: { select: { id: true, name: true } } } });
        await this.access.assertResource(userId, q, 'VIEW', 'Question not found');
        const { content_hash: _h, ...rest } = q!;
        return rest;
    }

    private validateManual(type: QuestionType, data: any, prompt: string) {
        const fail = (m: string) => {
            throw new BadRequestException(m);
        };
        switch (type) {
            case 'MCQ':
            case 'MULTI_SELECT':
                if (!Array.isArray(data.options) || data.options.length < 2 || data.options.length > 8) fail('Provide 2-8 options');
                if (!Array.isArray(data.correct) || !data.correct.length || data.correct.some((i: number) => i < 0 || i >= data.options.length)) fail('Mark the correct option(s)');
                if (type === 'MCQ' && data.correct.length !== 1) fail('Single-choice questions need exactly one correct option');
                return { options: data.options.map(String), correct: data.correct.map(Number) };
            case 'TRUE_FALSE':
                if (typeof data.correct !== 'boolean') fail('Specify whether the statement is true or false');
                return { correct: data.correct };
            case 'FILL_BLANK':
                if (!/_{3,}/.test(prompt)) fail('Fill-in-the-blank prompts must contain "_____"');
                if (!Array.isArray(data.answers) || !data.answers.length) fail('Provide at least one accepted answer');
                return { answers: data.answers.map(String) };
            case 'MATCHING':
                if (!Array.isArray(data.pairs) || data.pairs.length < 2) fail('Provide at least 2 pairs');
                return { pairs: data.pairs.map((p: any) => ({ left: String(p.left), right: String(p.right) })) };
            case 'ORDERING':
                if (!Array.isArray(data.items) || data.items.length < 2) fail('Provide at least 2 items in the correct order');
                return { items: data.items.map(String) };
            case 'FREE_TEXT':
                if (!data.expected_answer) fail('Provide a model answer');
                return { expected_answer: String(data.expected_answer), key_concepts: (data.key_concepts ?? []).map(String) };
        }
    }

    async create(userId: string, projectId: string, dto: CreateQuestionDto) {
        await this.access.assert(userId, projectId, 'CONTRIBUTE');
        const data = this.validateManual(dto.type, dto.data, dto.prompt);
        try {
            const q = await this.prisma.question.create({
                data: {
                    project_id: projectId,
                    type: dto.type,
                    prompt: dto.prompt.trim(),
                    data: data as Prisma.InputJsonValue,
                    explanation: dto.explanation,
                    difficulty: dto.difficulty ?? 2,
                    concept: dto.concept,
                    topic_id: dto.topic_id,
                    tags: dto.tags ?? [],
                    origin: ContentOrigin.MANUAL,
                    content_hash: questionHash(dto.type, dto.prompt),
                    created_by: userId,
                    updated_by: userId,
                },
            });
            return this.serialize(q);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('An identical question already exists');
            throw error;
        }
    }

    /** Edits keep a full version history; the original AI-generated version is preserved in `original`. */
    async update(userId: string, id: string, dto: UpdateQuestionDto) {
        const existing = await this.prisma.question.findUnique({ where: { id } });
        await this.access.assertResource(userId, existing, 'EDIT', 'Question not found');
        const type = dto.type ?? existing!.type;
        const prompt = dto.prompt ?? existing!.prompt;
        const data = dto.data || dto.type ? this.validateManual(type, dto.data ?? existing!.data, prompt) : undefined;
        const [, updated] = await this.prisma.$transaction([
            this.prisma.questionVersion.create({
                data: {
                    question_id: id,
                    version: existing!.version,
                    snapshot: { type: existing!.type, prompt: existing!.prompt, data: existing!.data, explanation: existing!.explanation, difficulty: existing!.difficulty, tags: existing!.tags } as Prisma.InputJsonValue,
                    edited_by: userId,
                },
            }),
            this.prisma.question.update({
                where: { id },
                data: {
                    type,
                    prompt,
                    data: data as Prisma.InputJsonValue,
                    explanation: dto.explanation,
                    difficulty: dto.difficulty,
                    concept: dto.concept,
                    topic_id: dto.topic_id,
                    tags: dto.tags,
                    version: { increment: 1 },
                    updated_by: userId,
                    content_hash: dto.prompt || dto.type ? questionHash(type, prompt) : undefined,
                },
            }),
        ]);
        return this.serialize(updated);
    }

    async restoreVersion(userId: string, id: string, version: number) {
        const v = await this.prisma.questionVersion.findFirst({ where: { question_id: id, version } });
        if (!v) throw new BadRequestException('Version not found');
        const snap = v.snapshot as any;
        return this.update(userId, id, { type: snap.type, prompt: snap.prompt, data: snap.data, explanation: snap.explanation, difficulty: snap.difficulty, tags: snap.tags });
    }

    async remove(userId: string, id: string) {
        const q = await this.prisma.question.findUnique({ where: { id } });
        await this.access.assertResource(userId, q, 'EDIT', 'Question not found');
        const used = await this.prisma.questionResponse.count({ where: { question_id: id } });
        if (used) await this.prisma.question.update({ where: { id }, data: { archived_at: new Date(), in_bank: false } });
        else await this.prisma.question.delete({ where: { id } });
        return { success: true };
    }
}
