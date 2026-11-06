import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { AttemptStatus, GenerationStatus, Prisma, QuestionType, Quiz, QuizMode } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { JobsService, JobTypes, PermanentJobError } from '@/core/jobs/jobs.service';
import { RealtimeEvents, RealtimeService } from '@/core/realtime/realtime.service';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { DomainEvents, QuestionAnsweredEvent, QuizCompletedEvent } from '@/shared/events/domain-events';
import { DomainEventsService } from '@/shared/events/domain-events.service';
import { recordStudySession } from '@/shared/utils/study-session.utils';
import { QuestionsService } from '../questions/questions.service';
import { TopicsService } from '../topics/topics.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { Passage } from '../ai/ai.types';
import { LearnerProfileService } from './learner-profile.service';
import { I18nService } from '@/shared/i18n/i18n.service';
import { normalizeLang } from '@/shared/i18n/translate';

import { AttemptQueryType, CreateQuizDto, SubmitAnswerDto } from './dto/quizzes.dto';

const DEFAULT_TYPES: QuestionType[] = ['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'MATCHING'];
const DEADLINE_GRACE_MS = 30_000;

interface QuizConfig {
    count: number;
    types: QuestionType[];
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed' | 'adaptive';
    topic_ids?: string[];
    document_ids?: string[];
    randomize: boolean;
    use_bank: boolean;
    review?: CreateQuizDto['review'];
    selection_text?: string;
    selection_document_id?: string;
    instructions?: string;
    target_difficulty?: number;
    focus_concepts?: string[];
}

@Injectable()
export class QuizzesService implements OnModuleInit {
    private readonly logger = new Logger(QuizzesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly jobs: JobsService,
        private readonly realtime: RealtimeService,
        private readonly events: DomainEventsService,
        private readonly questions: QuestionsService,
        private readonly topics: TopicsService,
        private readonly knowledge: KnowledgeService,
        private readonly profiles: LearnerProfileService,
        private readonly i18n: I18nService,
    ) { }

    onModuleInit() {
        this.jobs.register(JobTypes.GENERATE_QUIZ, (payload) => this.generate(payload.quizId));
    }

    // ── Quiz creation & generation ──

    async create(userId: string, projectId: string, dto: CreateQuizDto) {
        await this.access.assert(userId, projectId, 'STUDY');
        const mode = dto.mode ?? QuizMode.PRACTICE;
        if (mode === QuizMode.REVIEW && !dto.review) throw new BadRequestException('Review quizzes need a review configuration');
        if (mode === QuizMode.SELECTION && !dto.selection_text?.trim()) throw new BadRequestException('Select some text first');
        if (dto.shared) await this.access.assert(userId, projectId, 'CONTRIBUTE');
        const config: QuizConfig = {
            count: dto.count ?? (mode === QuizMode.EXAM ? 20 : mode === QuizMode.SELECTION ? 5 : 10),
            types: dto.types?.length ? dto.types : mode === QuizMode.EXAM ? ['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'FREE_TEXT', 'MATCHING', 'ORDERING'] : DEFAULT_TYPES,
            difficulty: dto.difficulty ?? (mode === QuizMode.ADAPTIVE ? 'adaptive' : 'mixed'),
            topic_ids: dto.topic_ids,
            document_ids: dto.document_ids,
            randomize: dto.randomize ?? true,
            use_bank: dto.use_bank ?? (mode === QuizMode.EXAM || mode === QuizMode.ADAPTIVE),
            review: dto.review,
            selection_text: dto.selection_text,
            selection_document_id: dto.selection_document_id,
            instructions: dto.instructions,
        };
        const title = dto.title?.trim() || (await this.defaultTitle(projectId, userId, mode));
        const quiz = await this.prisma.quiz.create({
            data: {
                project_id: projectId,
                created_by: userId,
                title,
                mode,
                status: GenerationStatus.PENDING,
                config: config as unknown as Prisma.InputJsonValue,
                time_limit_sec: dto.time_limit_min ? dto.time_limit_min * 60 : null,
                target_score: dto.target_score ?? null,
                is_shared: !!dto.shared,
            },
        });
        const job = await this.jobs.enqueue(JobTypes.GENERATE_QUIZ, { quizId: quiz.id }, { userId, projectId, resourceId: quiz.id, priority: 8, maxAttempts: 2 });
        return { ...quiz, job_id: job.id };
    }

    private async defaultTitle(projectId: string, userId: string, mode: QuizMode) {
        const lang = normalizeLang(await this.i18n.contentLanguageOf(projectId, userId));
        return this.i18n.t(lang, `quiz.title.${mode}`, { date: this.i18n.formatDate(lang, new Date()) });
    }

    private async setQuizStatus(quiz: Quiz, status: GenerationStatus, error?: string) {
        const updated = await this.prisma.quiz.update({ where: { id: quiz.id }, data: { status, error_message: error ?? null } });
        this.realtime.toUser(quiz.created_by, RealtimeEvents.GENERATION_STATUS, { kind: 'quiz', id: quiz.id, project_id: quiz.project_id, status, error: error ?? null });
        return updated;
    }

    private async generate(quizId: string) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
        if (!quiz) return { skipped: true };
        await this.setQuizStatus(quiz, GenerationStatus.GENERATING);
        const cfg = quiz.config as unknown as QuizConfig;
        const userId = quiz.created_by;
        try {
            let ids: string[] = [];
            switch (quiz.mode) {
                case QuizMode.REVIEW:
                    ids = await this.resolveReview(userId, quiz.project_id, cfg);
                    break;
                case QuizMode.ADAPTIVE:
                    ids = await this.resolveAdaptive(userId, quiz.project_id, cfg, quiz.id);
                    break;
                case QuizMode.EXAM:
                    ids = await this.resolveExam(userId, quiz.project_id, cfg);
                    break;
                case QuizMode.SELECTION:
                    ids = await this.resolveSelection(userId, quiz.project_id, cfg);
                    break;
                default:
                    ids = await this.questions.generate(userId, quiz.project_id, {
                        count: cfg.count,
                        types: cfg.types,
                        difficulty: cfg.difficulty,
                        topicIds: cfg.topic_ids,
                        documentIds: cfg.document_ids,
                        instructions: cfg.instructions,
                    });
            }
            if (!ids.length) throw new PermanentJobError('No questions could be prepared for this quiz.');
            if (cfg.randomize) ids = ids.sort(() => Math.random() - 0.5);
            await this.prisma.quizQuestion.createMany({ data: ids.map((id, i) => ({ quiz_id: quiz.id, question_id: id, order_index: i })), skipDuplicates: true });
            await this.setQuizStatus(quiz, GenerationStatus.READY);
            if (quiz.is_shared) this.events.emit(DomainEvents.CONTENT_SHARED, { userId, projectId: quiz.project_id, resourceId: quiz.id });
            return { questions: ids.length };
        } catch (error) {
            const message = error?.response?.message ?? error?.message ?? 'Generation failed';
            await this.setQuizStatus(quiz, GenerationStatus.FAILED, String(message).slice(0, 500));
            throw new PermanentJobError(String(message));
        }
    }

    /** Wrong-answer review: retry the exact missed questions, or generate NEW questions on the same concepts. */
    private async resolveReview(userId: string, projectId: string, cfg: QuizConfig): Promise<string[]> {
        const r = cfg.review!;
        const where: Prisma.QuestionResponseWhereInput = {
            user_id: userId,
            project_id: projectId,
            is_correct: false,
            ...(r.source === 'attempt' && r.attempt_id ? { attempt_id: r.attempt_id } : {}),
            ...(r.source === 'topic' && r.topic_id ? { question: { topic_id: r.topic_id } } : {}),
        };
        const wrong = await this.prisma.questionResponse.findMany({
            where,
            orderBy: { answered_at: 'desc' },
            select: { question_id: true, question: { select: { id: true, concept: true, chunk_id: true, type: true, archived_at: true } } },
            take: 300,
        });
        // Exclude questions answered correctly since the miss (they're resolved), unless reviewing a specific attempt.
        let candidates = [...new Map(wrong.filter((w) => !w.question.archived_at).map((w) => [w.question_id, w.question])).values()];
        if (r.source !== 'attempt') {
            const profile = await this.profiles.build(userId, projectId);
            const stillMissed = new Set(profile.missedQuestionIds);
            candidates = candidates.filter((c) => stillMissed.has(c.id));
        }
        if (!candidates.length) throw new PermanentJobError('No incorrect answers to review — great job!');
        if (r.strategy === 'retry') return candidates.slice(0, cfg.count).map((c) => c.id);

        const concepts = [...new Set(candidates.map((c) => c.concept).filter(Boolean) as string[])].slice(0, 8);
        const chunkIds = [...new Set(candidates.map((c) => c.chunk_id).filter(Boolean) as string[])].slice(0, 10);
        const passages = chunkIds.length ? await this.knowledge.passagesByIds(chunkIds) : undefined;
        const types = [...new Set(candidates.map((c) => c.type))].filter((t) => cfg.types.includes(t));
        return this.questions.generate(userId, projectId, {
            count: cfg.count,
            types: types.length ? types : cfg.types,
            difficulty: 'mixed',
            focusConcepts: concepts,
            passages,
            instructions: 'These are concepts the student previously got wrong. Write NEW questions that test the same underlying ideas from a different angle — do not reuse the previous wording.',
        });
    }

    /** Adaptive mix: weak concepts (new questions), due retries of missed questions, and new material at the learner's target difficulty. */
    private async resolveAdaptive(userId: string, projectId: string, cfg: QuizConfig, quizId: string): Promise<string[]> {
        const profile = await this.profiles.build(userId, projectId);
        const total = cfg.count;
        const ids: string[] = [];
        const retryCount = Math.min(profile.missedQuestionIds.length, Math.floor(total * 0.3));
        if (retryCount) {
            const recentlySeen = await this.prisma.questionResponse.findMany({
                where: { user_id: userId, project_id: projectId, answered_at: { gte: new Date(Date.now() - 20 * 60_000) } },
                select: { question_id: true },
            });
            const skip = new Set(recentlySeen.map((r) => r.question_id));
            ids.push(...profile.missedQuestionIds.filter((id) => !skip.has(id)).slice(0, retryCount));
        }
        const weakCount = profile.weakConcepts.length ? Math.ceil((total - ids.length) * 0.5) : 0;
        if (weakCount) {
            const generated = await this.questions
                .generate(userId, projectId, {
                    count: weakCount,
                    types: cfg.types,
                    difficulty: 'adaptive',
                    targetDifficulty: Math.max(1, profile.targetDifficulty - 0.5),
                    focusConcepts: profile.weakConcepts.slice(0, 5).map((c) => c.concept),
                    instructions: 'Target the concepts the student repeatedly misses, using fresh angles.',
                })
                .catch(() => [] as string[]);
            ids.push(...generated);
        }
        const rest = total - ids.length;
        if (rest > 0) {
            if (cfg.use_bank) {
                const answered = await this.prisma.questionResponse.findMany({ where: { user_id: userId, project_id: projectId }, select: { question_id: true }, distinct: ['question_id'] });
                const seen = new Set([...answered.map((a) => a.question_id), ...ids]);
                const lo = Math.floor(profile.targetDifficulty);
                const fresh = await this.prisma.question.findMany({
                    where: {
                        project_id: projectId,
                        archived_at: null,
                        type: { in: cfg.types },
                        difficulty: { gte: Math.max(1, lo - 1), lte: Math.min(5, lo + 1) },
                        id: { notIn: [...seen] },
                        ...(profile.weakTopicIds.length ? { OR: [{ topic_id: { in: profile.weakTopicIds } }, { topic_id: { not: null } }] } : {}),
                    },
                    take: rest,
                    select: { id: true },
                });
                ids.push(...fresh.map((f) => f.id));
            }
            const still = total - ids.length;
            if (still > 0) {
                ids.push(
                    ...(await this.questions.generate(userId, projectId, {
                        count: still,
                        types: cfg.types,
                        difficulty: 'adaptive',
                        targetDifficulty: profile.targetDifficulty,
                        topicIds: profile.weakTopicIds.length ? profile.weakTopicIds : cfg.topic_ids,
                    })),
                );
            }
        }
        await this.prisma.quiz.update({
            where: { id: quizId },
            data: { config: { ...cfg, target_difficulty: profile.targetDifficulty, focus_concepts: profile.weakConcepts.map((c) => c.concept) } as unknown as Prisma.InputJsonValue },
        });
        return [...new Set(ids)];
    }

    /** Exam simulation: realistic mix drawn from the bank (topics/types/difficulty filters) topped up with fresh questions. */
    private async resolveExam(userId: string, projectId: string, cfg: QuizConfig): Promise<string[]> {
        const ids: string[] = [];
        if (cfg.use_bank) {
            const diff =
                cfg.difficulty === 'easy' ? { lte: 2 } : cfg.difficulty === 'medium' ? { gte: 2, lte: 3 } : cfg.difficulty === 'hard' ? { gte: 4 } : undefined;
            const bank = await this.prisma.question.findMany({
                where: {
                    project_id: projectId,
                    archived_at: null,
                    type: { in: cfg.types },
                    ...(diff ? { difficulty: diff } : {}),
                    ...(cfg.topic_ids?.length ? { topic_id: { in: cfg.topic_ids } } : {}),
                    ...(cfg.document_ids?.length ? { document_id: { in: cfg.document_ids } } : {}),
                },
                select: { id: true, type: true },
                take: 400,
            });
            const shuffled = bank.sort(() => Math.random() - 0.5);
            // Balance types.
            const byType = new Map<string, string[]>();
            shuffled.forEach((q) => (byType.has(q.type) ? byType.get(q.type)!.push(q.id) : byType.set(q.type, [q.id])));
            const lists = [...byType.values()];
            const bankTarget = Math.floor(cfg.count * 0.7);
            while (ids.length < bankTarget && lists.some((l) => l.length)) for (const l of lists) if (l.length && ids.length < bankTarget) ids.push(l.shift()!);
        }
        const rest = cfg.count - ids.length;
        if (rest > 0) {
            ids.push(
                ...(await this.questions.generate(userId, projectId, {
                    count: rest,
                    types: cfg.types,
                    difficulty: cfg.difficulty === 'adaptive' ? 'mixed' : cfg.difficulty,
                    topicIds: cfg.topic_ids,
                    documentIds: cfg.document_ids,
                    instructions: 'Write realistic exam-style questions covering the breadth of the material.',
                })),
            );
        }
        return ids;
    }

    private async resolveSelection(userId: string, projectId: string, cfg: QuizConfig): Promise<string[]> {
        const text = cfg.selection_text!.trim();
        const context = await this.knowledge.retrieve([projectId], text.slice(0, 1000), { k: 2, userId, documentIds: cfg.selection_document_id ? [cfg.selection_document_id] : undefined });
        const anchor = context[0];
        const selected: Passage = {
            chunkId: anchor?.chunkId ?? '',
            documentId: anchor?.documentId ?? cfg.selection_document_id ?? '',
            documentTitle: anchor?.documentTitle ?? 'Selected text',
            pageStart: anchor?.pageStart ?? null,
            pageEnd: anchor?.pageEnd ?? null,
            section: anchor?.section ?? null,
            topicId: anchor?.topicId ?? null,
            content: text,
        };
        if (!selected.chunkId) throw new PermanentJobError('The selected text could not be matched to your study material.');
        return this.questions.generate(userId, projectId, {
            count: cfg.count,
            types: cfg.types,
            difficulty: cfg.difficulty,
            passages: [selected],
            instructions: 'Generate questions ONLY about the selected text (passage [1]).',
        });
    }

    // ── Quiz reads ──

    async list(userId: string, projectId: string) {
        await this.access.assert(userId, projectId, 'VIEW');
        const quizzes = await this.prisma.quiz.findMany({
            where: { project_id: projectId, OR: [{ created_by: userId }, { is_shared: true }] },
            orderBy: { created_at: 'desc' },
            take: 100,
            include: {
                _count: { select: { questions: true } },
                attempts: { where: { user_id: userId }, orderBy: { started_at: 'desc' }, select: { id: true, percentage: true, status: true, started_at: true, attempt_number: true } },
            },
        });
        return quizzes.map(({ attempts, _count, ...q }) => {
            const completed = attempts.filter((a) => a.status === AttemptStatus.COMPLETED);
            return {
                ...q,
                question_count: _count.questions,
                attempt_count: completed.length,
                best_percentage: completed.length ? Math.max(...completed.map((a) => a.percentage)) : null,
                last_attempt: attempts[0] ?? null,
                in_progress_attempt_id: attempts.find((a) => a.status === AttemptStatus.IN_PROGRESS)?.id ?? null,
            };
        });
    }

    private async loadQuiz(userId: string, quizId: string) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
        if (!quiz) throw new NotFoundException('Quiz not found');
        const access = await this.access.assert(userId, quiz.project_id, 'VIEW');
        if (!quiz.is_shared && quiz.created_by !== userId && !this.access.hasCapability(access.role, 'EDIT')) throw new NotFoundException('Quiz not found');
        return { quiz, access };
    }

    async get(userId: string, quizId: string) {
        const { quiz } = await this.loadQuiz(userId, quizId);
        const [count, attempts] = await Promise.all([
            this.prisma.quizQuestion.count({ where: { quiz_id: quizId } }),
            this.prisma.quizAttempt.findMany({ where: { quiz_id: quizId, user_id: userId }, orderBy: { started_at: 'desc' } }),
        ]);
        return { ...quiz, question_count: count, attempts };
    }

    async remove(userId: string, quizId: string) {
        const { quiz, access } = await this.loadQuiz(userId, quizId);
        if (quiz.created_by !== userId && !this.access.hasCapability(access.role, 'EDIT')) throw new ForbiddenException('Only the creator or an editor can delete this quiz');
        await this.prisma.quiz.delete({ where: { id: quizId } });
        return { success: true };
    }

    async share(userId: string, quizId: string) {
        const { quiz } = await this.loadQuiz(userId, quizId);
        await this.access.assert(userId, quiz.project_id, 'CONTRIBUTE');
        const updated = await this.prisma.quiz.update({ where: { id: quizId }, data: { is_shared: true } });
        this.events.emit(DomainEvents.CONTENT_SHARED, { userId, projectId: quiz.project_id, resourceId: quiz.id });
        return updated;
    }

    // ── Attempts ──

    async startAttempt(userId: string, quizId: string) {
        const { quiz } = await this.loadQuiz(userId, quizId);
        if (quiz.status !== GenerationStatus.READY) throw new BadRequestException('This quiz is not ready yet');
        const inProgress = await this.prisma.quizAttempt.findFirst({ where: { quiz_id: quizId, user_id: userId, status: AttemptStatus.IN_PROGRESS } });
        if (inProgress) {
            if (inProgress.deadline_at && inProgress.deadline_at.getTime() + DEADLINE_GRACE_MS < Date.now()) await this.complete(userId, inProgress.id);
            else return this.getAttempt(userId, inProgress.id);
        }
        const previous = await this.prisma.quizAttempt.count({ where: { quiz_id: quizId, user_id: userId } });
        const attempt = await this.prisma.quizAttempt.create({
            data: {
                quiz_id: quizId,
                user_id: userId,
                project_id: quiz.project_id,
                attempt_number: previous + 1,
                deadline_at: quiz.time_limit_sec ? new Date(Date.now() + quiz.time_limit_sec * 1000) : null,
            },
        });
        return this.getAttempt(userId, attempt.id);
    }

    private async loadAttempt(userId: string, attemptId: string) {
        const attempt = await this.prisma.quizAttempt.findUnique({ where: { id: attemptId }, include: { quiz: true } });
        if (!attempt || attempt.user_id !== userId) throw new NotFoundException('Attempt not found');
        await this.access.assert(userId, attempt.project_id, 'VIEW');
        return attempt;
    }

    async getAttempt(userId: string, attemptId: string) {
        const attempt = await this.loadAttempt(userId, attemptId);
        const isExam = attempt.quiz.mode === QuizMode.EXAM;
        const completed = attempt.status === AttemptStatus.COMPLETED;
        const [links, responses] = await Promise.all([
            this.prisma.quizQuestion.findMany({ where: { quiz_id: attempt.quiz_id }, orderBy: { order_index: 'asc' }, include: { question: true } }),
            this.prisma.questionResponse.findMany({ where: { attempt_id: attemptId } }),
        ]);
        const byQ = new Map(responses.map((r) => [r.question_id, r]));
        const reveal = completed || !isExam;
        const questions = links.map(({ question }) => {
            const r = byQ.get(question.id);
            const base = this.questions.toClient(question);
            if (!r) return { ...base, response: null };
            if (!reveal) return { ...base, response: { answer: r.answer, answered: true } };
            return {
                ...base,
                response: {
                    answer: r.answer,
                    answered: true,
                    is_correct: r.is_correct,
                    score: r.score,
                    feedback: r.feedback,
                    correct_answer: (r.feedback as any)?.correct_answer ?? null,
                    explanation: question.explanation,
                },
                ...(completed ? { explanation: question.explanation } : {}),
            };
        });
        const { quiz, ...rest } = attempt;
        return {
            attempt: rest,
            quiz: { id: quiz.id, title: quiz.title, mode: quiz.mode, time_limit_sec: quiz.time_limit_sec, target_score: quiz.target_score },
            questions,
            server_time: new Date().toISOString(),
        };
    }

    async submitAnswer(userId: string, attemptId: string, dto: SubmitAnswerDto) {
        const attempt = await this.loadAttempt(userId, attemptId);
        if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new BadRequestException('This attempt is already finished');
        if (attempt.deadline_at && attempt.deadline_at.getTime() + DEADLINE_GRACE_MS < Date.now()) {
            await this.complete(userId, attemptId);
            throw new BadRequestException('Time is up — the exam was submitted automatically');
        }
        const link = await this.prisma.quizQuestion.findUnique({ where: { quiz_id_question_id: { quiz_id: attempt.quiz_id, question_id: dto.question_id } }, include: { question: true } });
        if (!link) throw new BadRequestException('Question is not part of this quiz');
        const question = link.question;
        const isExam = attempt.quiz.mode === QuizMode.EXAM;
        const existing = await this.prisma.questionResponse.findUnique({ where: { attempt_id_question_id: { attempt_id: attemptId, question_id: question.id } } });
        if (existing && !isExam) throw new BadRequestException('You already answered this question');

        // Exam free-text answers are graded once at submission (answers can still change; avoids repeated AI cost).
        const grade =
            isExam && question.type === QuestionType.FREE_TEXT
                ? { isCorrect: false, score: 0, correctAnswer: null, feedback: { pending: true } as Record<string, unknown> }
                : await this.questions.grade(userId, question, dto.answer, attempt.project_id);
        const previouslyMissed =
            (await this.prisma.questionResponse.count({ where: { user_id: userId, question_id: question.id, is_correct: false, attempt_id: { not: attemptId } } })) > 0;
        const feedback = { ...(grade.feedback ?? {}), correct_answer: grade.correctAnswer } as Prisma.InputJsonValue;

        const response = existing
            ? await this.prisma.questionResponse.update({
                where: { id: existing.id },
                data: { answer: dto.answer as Prisma.InputJsonValue, is_correct: grade.isCorrect, score: grade.score, feedback, time_spent_ms: existing.time_spent_ms + (dto.time_spent_ms ?? 0), answered_at: new Date() },
            })
            : await this.prisma.questionResponse.create({
                data: {
                    attempt_id: attemptId,
                    question_id: question.id,
                    user_id: userId,
                    project_id: attempt.project_id,
                    answer: dto.answer as Prisma.InputJsonValue,
                    is_correct: grade.isCorrect,
                    score: grade.score,
                    feedback,
                    time_spent_ms: dto.time_spent_ms ?? 0,
                    difficulty: question.difficulty,
                },
            });

        let combo = attempt.current_combo;
        // Exams are distraction-free: rewards, mastery and combos are processed at submission.
        if (!existing && !isExam) {
            combo = grade.isCorrect ? attempt.current_combo + 1 : 0;
            await this.prisma.quizAttempt.update({ where: { id: attemptId }, data: { current_combo: combo, best_combo: Math.max(attempt.best_combo, combo) } });
            void this.topics.recordResult(userId, attempt.project_id, question.topic_id).catch(() => undefined);
            this.events.emit<QuestionAnsweredEvent>(DomainEvents.QUESTION_ANSWERED, {
                userId,
                projectId: attempt.project_id,
                questionId: question.id,
                responseId: response.id,
                attemptId,
                isCorrect: grade.isCorrect,
                difficulty: question.difficulty,
                combo,
                previouslyMissed,
                isExam,
            });
        }
        if (isExam) return { saved: true, question_id: question.id };
        return {
            question_id: question.id,
            response_id: response.id,
            is_correct: grade.isCorrect,
            score: grade.score,
            correct_answer: grade.correctAnswer,
            explanation: question.explanation,
            feedback: grade.feedback,
            source_ref: question.source_ref,
            combo,
            previously_missed: previouslyMissed,
        };
    }

    async complete(userId: string, attemptId: string) {
        const attempt = await this.loadAttempt(userId, attemptId);
        if (attempt.status === AttemptStatus.COMPLETED) return this.summary(userId, attemptId);
        const [links, responses] = await Promise.all([
            this.prisma.quizQuestion.findMany({ where: { quiz_id: attempt.quiz_id }, include: { question: { select: { id: true, difficulty: true, topic_id: true, concept: true } } } }),
            this.prisma.questionResponse.findMany({ where: { attempt_id: attemptId } }),
        ]);
        if (attempt.quiz.mode === QuizMode.EXAM) await this.finalizeExamResponses(userId, attempt, links, responses);
        const total = links.length;
        const score = responses.reduce((s, r) => s + r.score, 0);
        const correct = responses.filter((r) => r.is_correct).length;
        const percentage = total ? Math.round((score / total) * 1000) / 10 : 0;
        const end = attempt.deadline_at && attempt.deadline_at < new Date() ? attempt.deadline_at : new Date();
        const timeSpent = Math.max(1, Math.round((end.getTime() - attempt.started_at.getTime()) / 1000));
        const avgDifficulty = total ? links.reduce((s, l) => s + l.question.difficulty, 0) / total : null;
        const isExam = attempt.quiz.mode === QuizMode.EXAM;
        const analysis = await this.analyze(userId, attempt.project_id, links, responses, isExam, percentage, attempt.quiz.target_score);

        await this.prisma.quizAttempt.update({
            where: { id: attemptId },
            data: {
                status: AttemptStatus.COMPLETED,
                completed_at: new Date(),
                score,
                max_score: total,
                percentage,
                correct_count: correct,
                incorrect_count: total - correct,
                time_spent_sec: timeSpent,
                avg_difficulty: avgDifficulty,
                analysis: analysis as unknown as Prisma.InputJsonValue,
            },
        });
        this.events.emit<QuizCompletedEvent>(DomainEvents.QUIZ_COMPLETED, {
            userId,
            projectId: attempt.project_id,
            attemptId,
            quizId: attempt.quiz_id,
            percentage,
            correct,
            total,
            isExam,
            previousBestExam: analysis.previous_best ?? null,
        });
        this.events.emit(DomainEvents.STUDY_TIME_LOGGED, { userId, projectId: attempt.project_id, seconds: Math.min(timeSpent, 3 * 3600) });
        await recordStudySession(this.prisma, userId, attempt.project_id, isExam ? 'EXAM' : 'QUIZ', timeSpent).catch(() => undefined);
        return this.summary(userId, attemptId);
    }

    /** Grades deferred exam free-text answers, then emits answer events / mastery updates for every exam response. */
    private async finalizeExamResponses(
        userId: string,
        attempt: { id: string; project_id: string },
        links: { question: { id: string; difficulty: number; topic_id: string | null } }[],
        responses: Prisma.QuestionResponseGetPayload<object>[],
    ) {
        const pending = responses.filter((r) => (r.feedback as any)?.pending);
        for (let i = 0; i < pending.length; i += 4) {
            await Promise.all(
                pending.slice(i, i + 4).map(async (r) => {
                    const question = await this.prisma.question.findUniqueOrThrow({ where: { id: r.question_id } });
                    const grade = await this.questions.grade(userId, question, r.answer, attempt.project_id);
                    const feedback = { ...(grade.feedback ?? {}), correct_answer: grade.correctAnswer } as Prisma.InputJsonValue;
                    await this.prisma.questionResponse.update({ where: { id: r.id }, data: { is_correct: grade.isCorrect, score: grade.score, feedback } });
                    Object.assign(r, { is_correct: grade.isCorrect, score: grade.score, feedback });
                }),
            );
        }
        const byQ = new Map(links.map((l) => [l.question.id, l.question]));
        const topicIds = new Set<string>();
        for (const r of responses) {
            const q = byQ.get(r.question_id);
            if (!q) continue;
            if (q.topic_id) topicIds.add(q.topic_id);
            const previouslyMissed =
                (await this.prisma.questionResponse.count({ where: { user_id: userId, question_id: r.question_id, is_correct: false, attempt_id: { not: attempt.id } } })) > 0;
            this.events.emit<QuestionAnsweredEvent>(DomainEvents.QUESTION_ANSWERED, {
                userId,
                projectId: attempt.project_id,
                questionId: r.question_id,
                responseId: r.id,
                attemptId: attempt.id,
                isCorrect: r.is_correct,
                difficulty: q.difficulty,
                combo: 0,
                previouslyMissed,
                isExam: true,
            });
        }
        for (const topicId of topicIds) await this.topics.recordResult(userId, attempt.project_id, topicId).catch(() => undefined);
    }

    private async analyze(
        userId: string,
        projectId: string,
        links: { question: { id: string; difficulty: number; topic_id: string | null; concept: string | null } }[],
        responses: { question_id: string; is_correct: boolean; score: number }[],
        isExam: boolean,
        percentage: number,
        targetScore: number | null,
    ) {
        const { t } = await this.i18n.forUser(userId);
        const byQ = new Map(responses.map((r) => [r.question_id, r]));
        const topicStats = new Map<string, { correct: number; total: number }>();
        const missedConcepts = new Map<string, number>();
        for (const { question } of links) {
            const r = byQ.get(question.id);
            const key = question.topic_id ?? 'unassigned';
            const t = topicStats.get(key) ?? { correct: 0, total: 0 };
            t.total++;
            t.correct += r?.score ?? 0;
            topicStats.set(key, t);
            if (!r?.is_correct && question.concept) missedConcepts.set(question.concept, (missedConcepts.get(question.concept) ?? 0) + 1);
        }
        const topicIds = [...topicStats.keys()].filter((k) => k !== 'unassigned');
        const topics = topicIds.length ? await this.prisma.topic.findMany({ where: { id: { in: topicIds } }, select: { id: true, name: true } }) : [];
        const names = new Map(topics.map((t) => [t.id, t.name]));
        const by_topic = [...topicStats.entries()]
            .map(([id, s]) => ({ topic_id: id === 'unassigned' ? null : id, topic: names.get(id) ?? t('analysis.general'), correct: Math.round(s.correct * 10) / 10, total: s.total, percentage: Math.round((s.correct / s.total) * 100) }))
            .sort((a, b) => a.percentage - b.percentage);
        const weak = by_topic.filter((t) => t.percentage < 70);
        const recommendations: string[] = [];
        if (weak.length) recommendations.push(t('analysis.reviewWeak', { topics: weak.slice(0, 3).map((w) => w.topic).join(', ') }));
        if (missedConcepts.size) recommendations.push(t('analysis.mistakeReview'));
        if (percentage >= 90) recommendations.push(t('analysis.excellent'));
        else if (percentage < 60) recommendations.push(t('analysis.revisit'));
        let previous_best: number | null = null;
        let previous_exams: { id: string; percentage: number; completed_at: Date | null }[] = [];
        if (isExam) {
            previous_exams = await this.prisma.quizAttempt.findMany({
                where: { user_id: userId, project_id: projectId, status: AttemptStatus.COMPLETED, quiz: { mode: QuizMode.EXAM } },
                orderBy: { completed_at: 'desc' },
                take: 10,
                select: { id: true, percentage: true, completed_at: true },
            });
            previous_best = previous_exams.length ? Math.max(...previous_exams.map((e) => e.percentage)) : null;
        }
        return {
            by_topic,
            missed_concepts: [...missedConcepts.entries()].sort((a, b) => b[1] - a[1]).map(([concept, count]) => ({ concept, count })),
            recommendations,
            passed: targetScore ? percentage >= targetScore : null,
            target_score: targetScore,
            previous_best,
            previous_exams: previous_exams.map((e) => ({ attempt_id: e.id, percentage: e.percentage, completed_at: e.completed_at })),
        };
    }

    /** Session summary: score, XP earned, best combo, topics improved, comparisons. */
    async summary(userId: string, attemptId: string) {
        const attempt = await this.loadAttempt(userId, attemptId);
        const [xp, history] = await Promise.all([
            this.prisma.xpEvent.aggregate({ where: { user_id: userId, source_id: { startsWith: attemptId } }, _sum: { amount: true } }),
            this.prisma.quizAttempt.findMany({
                where: { quiz_id: attempt.quiz_id, user_id: userId, status: AttemptStatus.COMPLETED },
                orderBy: { attempt_number: 'asc' },
                select: { id: true, attempt_number: true, percentage: true, completed_at: true },
            }),
        ]);
        const { quiz, ...rest } = attempt;
        return {
            attempt: { ...rest, xp_earned: xp._sum.amount ?? 0 },
            quiz: { id: quiz.id, title: quiz.title, mode: quiz.mode, target_score: quiz.target_score },
            history,
        };
    }

    async history(userId: string, projectId: string, q: AttemptQueryType) {
        await this.access.assert(userId, projectId, 'VIEW');
        const attempts = await this.prisma.quizAttempt.findMany({
            where: { user_id: userId, project_id: projectId, status: AttemptStatus.COMPLETED, ...(q.quiz_id ? { quiz_id: q.quiz_id } : {}), ...(q.mode ? { quiz: { mode: q.mode } } : {}) },
            orderBy: { completed_at: 'desc' },
            take: q.limit,
            include: { quiz: { select: { id: true, title: true, mode: true } } },
        });
        return attempts.map((a) => ({
            id: a.id,
            quiz: a.quiz,
            attempt_number: a.attempt_number,
            started_at: a.started_at,
            completed_at: a.completed_at,
            score: a.score,
            max_score: a.max_score,
            percentage: a.percentage,
            correct_count: a.correct_count,
            incorrect_count: a.incorrect_count,
            time_spent_sec: a.time_spent_sec,
            avg_difficulty: a.avg_difficulty,
            best_combo: a.best_combo,
            missed: ((a.analysis as any)?.missed_concepts ?? []).slice(0, 5),
        }));
    }

    /** Overview for the wrong-answer review screen. */
    async reviewOverview(userId: string, projectId: string) {
        await this.access.assert(userId, projectId, 'VIEW');
        const profile = await this.profiles.build(userId, projectId);
        const missed = profile.missedQuestionIds.length
            ? await this.prisma.question.findMany({
                where: { id: { in: profile.missedQuestionIds }, archived_at: null },
                select: { id: true, prompt: true, type: true, concept: true, topic_id: true, topic: { select: { name: true } } },
            })
            : [];
        const general = this.i18n.t(await this.i18n.languageOf(userId), 'analysis.general');
        const byTopic = new Map<string, { topic_id: string | null; topic: string; count: number }>();
        for (const q of missed) {
            const key = q.topic_id ?? 'none';
            const e = byTopic.get(key) ?? { topic_id: q.topic_id, topic: q.topic?.name ?? general, count: 0 };
            e.count++;
            byTopic.set(key, e);
        }
        const attempts = await this.prisma.quizAttempt.findMany({
            where: { user_id: userId, project_id: projectId, status: AttemptStatus.COMPLETED, incorrect_count: { gt: 0 } },
            orderBy: { completed_at: 'desc' },
            take: 10,
            select: { id: true, attempt_number: true, incorrect_count: true, completed_at: true, quiz: { select: { title: true } } },
        });
        return {
            total_missed: missed.length,
            weak_concepts: profile.weakConcepts,
            by_topic: [...byTopic.values()].sort((a, b) => b.count - a.count),
            attempts,
            questions: missed.slice(0, 50),
        };
    }

    /** Shared quiz results: individual scores, group average, leaderboard and per-question difficulty. */
    async groupResults(userId: string, quizId: string) {
        const { quiz } = await this.loadQuiz(userId, quizId);
        const attempts = await this.prisma.quizAttempt.findMany({
            where: { quiz_id: quizId, status: AttemptStatus.COMPLETED },
            include: { user: { select: { id: true, full_name: true, email: true, preferences: { select: { leaderboard_opt_in: true } } } } },
        });
        const best = new Map<string, (typeof attempts)[number]>();
        for (const a of attempts) if (!best.has(a.user_id) || best.get(a.user_id)!.percentage < a.percentage) best.set(a.user_id, a);
        const rows = [...best.values()].sort((a, b) => b.percentage - a.percentage || a.time_spent_sec - b.time_spent_sec);
        const anonymous = this.i18n.t(await this.i18n.languageOf(userId), 'anonymous');
        const responses = await this.prisma.questionResponse.groupBy({ by: ['question_id'], where: { attempt: { quiz_id: quizId, status: AttemptStatus.COMPLETED } }, _avg: { score: true }, _count: { _all: true } });
        const qs = await this.prisma.question.findMany({ where: { id: { in: responses.map((r) => r.question_id) } }, select: { id: true, prompt: true } });
        const prompts = new Map(qs.map((q) => [q.id, q.prompt]));
        return {
            quiz: { id: quiz.id, title: quiz.title },
            participants: rows.length,
            group_average: rows.length ? Math.round((rows.reduce((s, r) => s + r.percentage, 0) / rows.length) * 10) / 10 : null,
            leaderboard: rows.map((r, i) => {
                const visible = r.user_id === userId || r.user.preferences?.leaderboard_opt_in;
                return {
                    rank: i + 1,
                    user_id: visible ? r.user_id : null,
                    name: visible ? r.user.full_name || r.user.email.split('@')[0] : anonymous,
                    is_me: r.user_id === userId,
                    percentage: r.percentage,
                    time_spent_sec: r.time_spent_sec,
                };
            }),
            question_difficulty: responses
                .map((r) => ({ question_id: r.question_id, prompt: prompts.get(r.question_id) ?? '', percent_correct: Math.round((r._avg.score ?? 0) * 100), responses: r._count._all }))
                .sort((a, b) => a.percent_correct - b.percent_correct),
        };
    }
}
