import { BadRequestException, Injectable } from '@nestjs/common';
import { AttemptStatus, CardStatus, Prisma, QuizMode, StudyActivityType } from 'generated/prisma';
import { DateTime } from 'luxon';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ProjectAccessService } from '@/shared/access/project-access.service';
import { DomainEvents } from '@/shared/events/domain-events';
import { DomainEventsService } from '@/shared/events/domain-events.service';
import { recordStudySession } from '@/shared/utils/study-session.utils';
import { localDateKey, safeZone } from '@/shared/utils/date.utils';
import { FlashcardsService } from '../flashcards/flashcards.service';
import { GamificationService } from '../gamification/gamification.service';
import { I18nService } from '@/shared/i18n/i18n.service';
import { LearnerProfileService } from '../quizzes/learner-profile.service';
import { TopicsService } from '../topics/topics.service';

export interface ReadinessFactor {
    key: string;
    label: string;
    value: number | null;
    weight: number;
}

export interface Readiness {
    score: number;
    factors: ReadinessFactor[];
    blockers: string[];
    confidence: 'low' | 'medium' | 'high';
}

export interface SessionBlock {
    type: 'flashcards' | 'weak_topics' | 'adaptive_quiz' | 'recall' | 'exam' | 'upload';
    title: string;
    minutes: number;
    project_id: string | null;
    project_title: string | null;
    count?: number;
    reason: string;
    link: string;
    topic_ids?: string[];
}

@Injectable()
export class StudyService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly events: DomainEventsService,
        private readonly profiles: LearnerProfileService,
        private readonly topics: TopicsService,
        private readonly flashcards: FlashcardsService,
        private readonly gamification: GamificationService,
        private readonly i18n: I18nService,
    ) { }

    private async tz(userId: string) {
        const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { timezone: true, full_name: true, email: true } });
        return { tz: safeZone(u?.timezone), name: u?.full_name || u?.email.split('@')[0] || 'there' };
    }

    // ── Study time tracking ──

    async logActivity(userId: string, dto: { project_id?: string; type: StudyActivityType; seconds: number }) {
        if (dto.project_id) await this.access.assert(userId, dto.project_id, 'STUDY');
        const seconds = Math.max(0, Math.min(300, Math.round(dto.seconds)));
        if (!seconds) return { logged: 0 };
        await recordStudySession(this.prisma, userId, dto.project_id ?? null, dto.type, seconds);
        this.events.emit(DomainEvents.STUDY_TIME_LOGGED, { userId, projectId: dto.project_id ?? null, seconds });
        return { logged: seconds };
    }

    // ── Exam readiness ──

    async readiness(userId: string, projectId: string): Promise<Readiness> {
        const { t } = await this.i18n.forUser(userId);
        const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { target_score: true, exam_date: true } });
        const [profile, attempts, topicList, cardCounts, retentionLogs, lastExam] = await Promise.all([
            this.profiles.build(userId, projectId),
            this.prisma.quizAttempt.findMany({
                where: { user_id: userId, project_id: projectId, status: AttemptStatus.COMPLETED },
                orderBy: { completed_at: 'desc' },
                take: 10,
                select: { percentage: true, completed_at: true },
            }),
            this.topics.flatMastery(userId, projectId),
            this.flashcards.counts(userId, [projectId]),
            this.prisma.reviewLog.findMany({ where: { user_id: userId, project_id: projectId, reviewed_at: { gte: new Date(Date.now() - 30 * 86_400_000) }, prev_interval: { gte: 1 } }, select: { rating: true } }),
            this.prisma.quizAttempt.findFirst({
                where: { user_id: userId, project_id: projectId, status: AttemptStatus.COMPLETED, quiz: { mode: QuizMode.EXAM } },
                orderBy: { completed_at: 'desc' },
                select: { percentage: true },
            }),
        ]);
        const weighted = (vals: number[]) => {
            let w = 0;
            let s = 0;
            vals.forEach((v, i) => {
                const wi = Math.pow(0.85, i);
                w += wi;
                s += v * wi;
            });
            return w ? s / w : null;
        };
        const quizPerf = attempts.length ? weighted(attempts.map((a) => a.percentage)) : null;
        const recent = profile.recentAccuracy && profile.answered >= 5 ? profile.recentAccuracy * 100 : null;
        const hard = [3, 4, 5].map((d) => profile.byDifficulty[d]).filter((b) => b.total > 0);
        const hardAcc = hard.length ? (hard.reduce((s, b) => s + (b.accuracy ?? 0) * b.total, 0) / hard.reduce((s, b) => s + b.total, 0)) * 100 : null;
        const reviewedCards = cardCounts.learning + cardCounts.known + cardCounts.needs_review;
        const retention = retentionLogs.length >= 5 ? (retentionLogs.filter((l) => l.rating !== 'AGAIN').length / retentionLogs.length) * 100 : reviewedCards ? (cardCounts.known / reviewedCards) * 100 : null;
        const leaves = topicList.filter((t: any) => !topicList.some((c) => c.parent_id === t.id));
        const masteryAvg = leaves.length ? leaves.reduce((s, t) => s + t.mastery, 0) / leaves.length : null;
        const examScore = lastExam?.percentage ?? null;

        const factors: ReadinessFactor[] = [
            { key: 'quiz_performance', label: t('readiness.factor.quiz_performance'), value: quizPerf, weight: 0.25 },
            { key: 'recent_performance', label: t('readiness.factor.recent_performance'), value: recent, weight: 0.15 },
            { key: 'difficulty', label: t('readiness.factor.difficulty'), value: hardAcc, weight: 0.15 },
            { key: 'retention', label: t('readiness.factor.retention'), value: retention, weight: 0.1 },
            { key: 'topic_mastery', label: t('readiness.factor.topic_mastery'), value: masteryAvg, weight: 0.25 },
            { key: 'exam_simulation', label: t('readiness.factor.exam_simulation'), value: examScore, weight: 0.1 },
        ].map((f) => ({ ...f, value: f.value === null ? null : Math.round(f.value) }));
        const present = factors.filter((f) => f.value !== null);
        const totalW = present.reduce((s, f) => s + f.weight, 0);
        let score = totalW ? present.reduce((s, f) => s + (f.value as number) * f.weight, 0) / totalW : 0;
        // Coverage penalty: untested topics cap readiness.
        const practiced = leaves.filter((t) => t.attempts > 0).length;
        const coverage = leaves.length ? practiced / leaves.length : profile.answered > 0 ? 1 : 0;
        score = score * (0.5 + 0.5 * coverage);
        if (profile.answered < 10) score = Math.min(score, 40 + profile.answered * 3);
        score = Math.round(Math.max(0, Math.min(100, score)));

        const blockers: string[] = [];
        const weakest = [...leaves].filter((t) => t.attempts > 0).sort((a, b) => a.mastery - b.mastery)[0];
        if (weakest && weakest.mastery < 60) {
            blockers.push(
                score >= 70
                    ? t('readiness.blocker.weakTopicStrong', { topic: weakest.name, mastery: weakest.mastery })
                    : t('readiness.blocker.weakTopic', { topic: weakest.name, mastery: weakest.mastery }),
            );
        }
        if (leaves.length && coverage < 0.8) blockers.push(t('readiness.blocker.untested', { untested: leaves.length - practiced, total: leaves.length }));
        if (hardAcc !== null && quizPerf !== null && hardAcc < quizPerf - 15) blockers.push(t('readiness.blocker.hardQuestions'));
        if (cardCounts.due > 20) blockers.push(t('readiness.blocker.overdue', { count: cardCounts.due }));
        if (examScore === null && project.exam_date) blockers.push(t('readiness.blocker.noExam'));
        if (examScore !== null && examScore < project.target_score) blockers.push(t('readiness.blocker.examBelowTarget', { score: Math.round(examScore), target: project.target_score }));
        if (profile.weakConcepts.length) blockers.push(t('readiness.blocker.missedConcepts', { concepts: profile.weakConcepts.slice(0, 3).map((c) => c.concept).join(', ') }));
        if (!profile.answered) blockers.push(t('readiness.blocker.noAnswers'));

        if (score >= 90) void this.gamification.markExamReady(userId).catch(() => undefined);
        return { score, factors, blockers: blockers.slice(0, 5), confidence: profile.answered >= 60 ? 'high' : profile.answered >= 15 ? 'medium' : 'low' };
    }

    // ── Study plan ──

    async plan(userId: string, projectId: string) {
        await this.access.assert(userId, projectId, 'VIEW');
        const { t } = await this.i18n.forUser(userId);
        const { tz } = await this.tz(userId);
        const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
        const [readiness, topicList, cardCounts, g, week] = await Promise.all([
            this.readiness(userId, projectId),
            this.topics.flatMastery(userId, projectId),
            this.flashcards.counts(userId, [projectId]),
            this.prisma.userGamification.findUnique({ where: { user_id: userId } }),
            this.prisma.studySession.aggregate({ where: { user_id: userId, project_id: projectId, started_at: { gte: new Date(Date.now() - 7 * 86_400_000) } }, _sum: { duration_sec: true } }),
        ]);
        const today = DateTime.now().setZone(tz).startOf('day');
        const examDay = project.exam_date ? DateTime.fromJSDate(project.exam_date).setZone(tz).startOf('day') : null;
        const daysRemaining = examDay ? Math.max(0, Math.round(examDay.diff(today, 'days').days)) : null;
        const leaves = topicList.filter((t: any) => !topicList.some((c) => c.parent_id === t.id));
        const gap = Math.max(0, project.target_score - readiness.score);
        const daysPerWeek = project.weekly_days_target;
        const studyDays = daysRemaining !== null ? Math.max(1, Math.round((daysRemaining * daysPerWeek) / 7)) : null;
        // Workload estimate: each readiness point ≈ 12 minutes of focused practice, plus reviews and unpracticed topics.
        const workloadMin = gap * 12 + leaves.filter((t) => t.attempts === 0).length * 30 + cardCounts.new * 1.5 + cardCounts.due * 0.5;
        let minutesPerDay = studyDays ? Math.ceil(workloadMin / studyDays / 5) * 5 : project.daily_minutes_goal;
        minutesPerDay = Math.max(project.daily_minutes_goal, g?.daily_goal_minutes ?? 0, Math.min(180, minutesPerDay));
        const priority = [...leaves]
            .map((t) => ({ id: t.id, name: t.name, mastery: t.mastery, attempts: t.attempts, score: (100 - t.mastery) * (t.attempts === 0 ? 1.2 : 1) + Math.log1p(t.counts.chunks) * 4 }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);
        const actualWeekMin = Math.round((week._sum.duration_sec ?? 0) / 60);
        const plannedWeekMin = minutesPerDay * daysPerWeek;
        const onTrack = actualWeekMin >= plannedWeekMin * 0.8;
        const schedule = Array.from({ length: Math.min(7, Math.max(1, daysRemaining ?? 7)) }, (_, i) => {
            const day = today.plus({ days: i });
            const focus = priority.length ? priority[i % priority.length] : null;
            const isRest = i % 7 >= daysPerWeek;
            return {
                date: day.toISODate(),
                rest: isRest,
                minutes: isRest ? 0 : minutesPerDay,
                focus_topic: isRest ? null : focus ? { id: focus.id, name: focus.name } : null,
                activities: isRest
                    ? []
                    : [
                        { type: 'flashcards', minutes: Math.round(minutesPerDay * 0.3) },
                        { type: 'adaptive_quiz', minutes: Math.round(minutesPerDay * 0.4) },
                        { type: 'recall', minutes: Math.round(minutesPerDay * 0.15) },
                        { type: daysRemaining !== null && daysRemaining <= 7 && i % 3 === 0 ? 'exam' : 'weak_topics', minutes: Math.round(minutesPerDay * 0.15) },
                    ],
            };
        });
        const plan = {
            exam_date: project.exam_date,
            days_remaining: daysRemaining,
            target_score: project.target_score,
            readiness: readiness.score,
            recommended: { minutes_per_day: minutesPerDay, days_per_week: daysPerWeek },
            priority_topics: priority.map(({ score: _s, ...p }) => p),
            schedule,
            progress: { actual_week_minutes: actualWeekMin, planned_week_minutes: plannedWeekMin, on_track: onTrack },
            advice: [
                !onTrack ? t('plan.advice.behind', { actual: actualWeekMin, planned: plannedWeekMin }) : t('plan.advice.onTrack'),
                daysRemaining !== null && daysRemaining <= 14 ? t('plan.advice.examClose') : t('plan.advice.retention'),
                gap > 0 ? t('plan.advice.gap', { gap, target: project.target_score }) : t('plan.advice.atTarget'),
            ],
            generated_at: new Date(),
        };
        if (!onTrack && actualWeekMin > 0) plan.recommended.minutes_per_day = Math.min(180, Math.ceil((minutesPerDay * 1.15) / 5) * 5);
        await this.prisma.studyPlan.upsert({
            where: { project_id_user_id: { project_id: projectId, user_id: userId } },
            create: { project_id: projectId, user_id: userId, plan: plan as unknown as Prisma.InputJsonValue },
            update: { plan: plan as unknown as Prisma.InputJsonValue, generated_at: new Date() },
        });
        return plan;
    }

    // ── Daily recommended session ──

    async dailySession(userId: string, projectId?: string) {
        const { t } = await this.i18n.forUser(userId);
        const projectIds = projectId ? [projectId] : await this.access.projectIdsForUser(userId);
        if (projectId) await this.access.assert(userId, projectId, 'STUDY');
        const projects = await this.prisma.project.findMany({ where: { id: { in: projectIds }, archived_at: null }, select: { id: true, title: true, exam_date: true } });
        const { tz } = await this.tz(userId);
        const g = await this.prisma.userGamification.findUnique({ where: { user_id: userId } });
        const today = localDateKey(tz);
        const activity = await this.prisma.dailyActivity.findUnique({ where: { user_id_date: { user_id: userId, date: today } } });
        if (!projects.length) {
            return { date: today, total_minutes: 0, goal_minutes: g?.daily_goal_minutes ?? 20, blocks: [] as SessionBlock[], focus_project: null, completed: false, progress: { minutes: activity?.minutes_studied ?? 0 } };
        }
        // Focus project: nearest exam, then most weak material.
        const ranked = await Promise.all(
            projects.map(async (p) => {
                const days = p.exam_date ? (p.exam_date.getTime() - Date.now()) / 86_400_000 : 999;
                const profile = await this.profiles.build(userId, p.id);
                return { p, days, profile, score: (days > 0 && days < 999 ? 100 / Math.max(1, days) : 0) + profile.weakConcepts.length * 2 + profile.missedQuestionIds.length * 0.2 };
            }),
        );
        ranked.sort((a, b) => b.score - a.score);
        const focus = ranked[0];
        const counts = await this.flashcards.counts(userId, projects.map((p) => p.id));
        const blocks: SessionBlock[] = [];
        const docCount = await this.prisma.studyDocument.count({ where: { project_id: focus.p.id, status: 'READY' } });
        if (!docCount) {
            blocks.push({ type: 'upload', title: t('session.upload.title'), minutes: 5, project_id: focus.p.id, project_title: focus.p.title, reason: t('session.upload.reason'), link: `/projects/${focus.p.id}/documents` });
        }
        const reviewable = counts.due + Math.min(counts.new, 15);
        if (reviewable > 0) {
            blocks.push({
                type: 'flashcards',
                title: t('session.flashcards.title'),
                minutes: Math.min(20, Math.max(5, Math.ceil(reviewable * 0.4))),
                project_id: projectId ?? null,
                project_title: projectId ? focus.p.title : null,
                count: counts.due,
                reason: counts.due ? t('session.flashcards.reasonDue', { count: counts.due }) : t('session.flashcards.reasonNew'),
                link: projectId ? `/projects/${projectId}/flashcards/review` : '/study?mode=review',
            });
        }
        if (focus.profile.weakTopicIds.length || focus.profile.weakConcepts.length) {
            const names = focus.profile.weakConcepts.slice(0, 3).map((c) => c.concept);
            blocks.push({
                type: 'weak_topics',
                title: t('session.weak.title'),
                minutes: 15,
                project_id: focus.p.id,
                project_title: focus.p.title,
                count: focus.profile.weakConcepts.length,
                reason: names.length ? t('session.weak.reasonConcepts', { concepts: names.join(', ') }) : t('session.weak.reason'),
                link: `/projects/${focus.p.id}/quizzes?review=all_incorrect`,
                topic_ids: focus.profile.weakTopicIds,
            });
        }
        if (docCount) {
            blocks.push({
                type: 'adaptive_quiz',
                title: t('session.adaptive.title'),
                minutes: 20,
                project_id: focus.p.id,
                project_title: focus.p.title,
                reason: t('session.adaptive.reason', { level: focus.profile.targetDifficulty.toFixed(1) }),
                link: `/projects/${focus.p.id}/quizzes?start=adaptive`,
            });
            blocks.push({ type: 'recall', title: t('session.recall.title'), minutes: 10, project_id: focus.p.id, project_title: focus.p.title, reason: t('session.recall.reason'), link: `/projects/${focus.p.id}/recall` });
        }
        if (focus.days > 0 && focus.days <= 14 && docCount) {
            const lastExam = await this.prisma.quizAttempt.findFirst({ where: { user_id: userId, project_id: focus.p.id, quiz: { mode: QuizMode.EXAM }, completed_at: { gte: new Date(Date.now() - 4 * 86_400_000) } } });
            if (!lastExam)
                blocks.push({ type: 'exam', title: t('session.exam.title'), minutes: 30, project_id: focus.p.id, project_title: focus.p.title, reason: t('session.exam.reason', { days: Math.ceil(focus.days) }), link: `/projects/${focus.p.id}/exam` });
        }
        const goal = g?.daily_goal_minutes ?? 20;
        // Trim the plan to roughly the daily goal (keeping order of priority), never below the first block.
        let total = 0;
        const trimmed = blocks.filter((b, i) => {
            if (i === 0 || total + b.minutes <= Math.max(goal, 25) * 1.3) {
                total += b.minutes;
                return true;
            }
            return false;
        });
        const completed = !!(await this.prisma.xpEvent.findFirst({ where: { user_id: userId, source_type: 'daily_session', source_id: today }, select: { id: true } }));
        return {
            date: today,
            total_minutes: total,
            goal_minutes: goal,
            blocks: trimmed,
            focus_project: { id: focus.p.id, title: focus.p.title },
            completed,
            progress: { minutes: activity?.minutes_studied ?? 0, questions: activity?.questions_answered ?? 0, cards: activity?.cards_reviewed ?? 0, goal_met: !!activity?.goal_met },
        };
    }

    async completeDailySession(userId: string) {
        const { tz } = await this.tz(userId);
        const today = localDateKey(tz);
        const activity = await this.prisma.dailyActivity.findUnique({ where: { user_id_date: { user_id: userId, date: today } } });
        const meaningful = activity && (activity.minutes_studied >= 10 || activity.questions_answered >= 5 || activity.cards_reviewed >= 10);
        if (!meaningful) throw new BadRequestException("Complete at least part of today's session first (10+ minutes, 5 questions or 10 cards).");
        this.events.emit(DomainEvents.DAILY_SESSION_COMPLETED, { userId });
        return { success: true };
    }

    // ── Project overview & analytics ──

    async overview(userId: string, projectId: string) {
        const access = await this.access.assert(userId, projectId, 'VIEW');
        const { tz } = await this.tz(userId);
        const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
        const [readiness, docs, counts, recentAttempts, flat, week, session] = await Promise.all([
            this.readiness(userId, projectId),
            this.prisma.studyDocument.groupBy({ by: ['status'], where: { project_id: projectId }, _count: { _all: true } }),
            this.flashcards.counts(userId, [projectId]),
            this.prisma.quizAttempt.findMany({
                where: { user_id: userId, project_id: projectId, status: AttemptStatus.COMPLETED },
                orderBy: { completed_at: 'desc' },
                take: 10,
                include: { quiz: { select: { title: true, mode: true } } },
            }),
            this.topics.flatMastery(userId, projectId),
            this.prisma.studySession.aggregate({ where: { user_id: userId, project_id: projectId, started_at: { gte: new Date(Date.now() - 7 * 86_400_000) } }, _sum: { duration_sec: true } }),
            this.dailySession(userId, projectId),
        ]);
        const docCount = (s: string[]) => docs.filter((d) => s.includes(d.status)).reduce((n, d) => n + d._count._all, 0);
        const leaves = flat.filter((t: any) => !flat.some((c) => c.parent_id === t.id));
        const progress = leaves.length ? Math.round(leaves.reduce((s, t) => s + t.mastery, 0) / leaves.length) : 0;
        if (progress !== project.progress && access.role === 'OWNER') await this.prisma.project.update({ where: { id: projectId }, data: { progress } });
        const accuracy = recentAttempts.length ? Math.round(recentAttempts.reduce((s, a) => s + a.percentage, 0) / recentAttempts.length) : null;
        const examDays = project.exam_date
            ? Math.max(0, Math.round(DateTime.fromJSDate(project.exam_date).setZone(tz).startOf('day').diff(DateTime.now().setZone(tz).startOf('day'), 'days').days))
            : null;
        return {
            project: { id: project.id, title: project.title, target_score: project.target_score, status: project.status },
            readiness,
            progress,
            documents: { total: docs.reduce((n, d) => n + d._count._all, 0), ready: docCount(['READY']), failed: docCount(['FAILED']), processing: docCount(['UPLOADED', 'PROCESSING', 'EXTRACTING', 'CHUNKING', 'INDEXING']) },
            cards_due: counts.due,
            card_counts: counts,
            quiz_accuracy: accuracy,
            recent_attempts: recentAttempts.map((a) => ({ id: a.id, quiz_title: a.quiz.title, mode: a.quiz.mode, percentage: a.percentage, completed_at: a.completed_at })),
            weak_topics: leaves
                .filter((t) => t.attempts > 0)
                .sort((a, b) => a.mastery - b.mastery)
                .slice(0, 5)
                .map((t) => ({ id: t.id, name: t.name, mastery: t.mastery })),
            topics_mastered: leaves.filter((t) => t.mastered).length,
            topics_total: leaves.length,
            study_time_week_min: Math.round((week._sum.duration_sec ?? 0) / 60),
            exam: { date: project.exam_date, days_remaining: examDays },
            recommendation: {
                title: this.i18n.t(await this.i18n.languageOf(userId), 'session.recommendationTitle'),
                items: session.blocks.map((b) => ({ type: b.type, label: b.title, minutes: b.minutes, reason: b.reason, link: b.link })),
            },
        };
    }

    async progress(userId: string, projectId: string) {
        await this.access.assert(userId, projectId, 'VIEW');
        const { tz } = await this.tz(userId);
        const since = new Date(Date.now() - 60 * 86_400_000);
        const [attempts, responses, sessions, reviews, flat, recalls] = await Promise.all([
            this.prisma.quizAttempt.findMany({
                where: { user_id: userId, project_id: projectId, status: AttemptStatus.COMPLETED },
                orderBy: { completed_at: 'asc' },
                select: { id: true, percentage: true, completed_at: true, attempt_number: true, time_spent_sec: true, quiz: { select: { title: true, mode: true } } },
            }),
            this.prisma.questionResponse.findMany({ where: { user_id: userId, project_id: projectId, answered_at: { gte: since } }, select: { score: true, is_correct: true, answered_at: true, difficulty: true } }),
            this.prisma.studySession.findMany({ where: { user_id: userId, project_id: projectId, started_at: { gte: since } }, select: { started_at: true, duration_sec: true, type: true } }),
            this.prisma.reviewLog.findMany({ where: { user_id: userId, project_id: projectId, reviewed_at: { gte: since } }, select: { rating: true, reviewed_at: true, prev_interval: true } }),
            this.topics.flatMastery(userId, projectId),
            this.prisma.recallAttempt.findMany({ where: { user_id: userId, project_id: projectId }, select: { score: true, mode: true } }),
        ]);
        const dayKey = (d: Date) => DateTime.fromJSDate(d).setZone(tz).toISODate() as string;
        const days = Array.from({ length: 30 }, (_, i) => DateTime.now().setZone(tz).minus({ days: 29 - i }).toISODate() as string);
        const daily = days.map((date) => {
            const r = responses.filter((x) => dayKey(x.answered_at) === date);
            return {
                date,
                minutes: Math.round(sessions.filter((s) => dayKey(s.started_at) === date).reduce((n, s) => n + s.duration_sec, 0) / 60),
                questions: r.length,
                accuracy: r.length ? Math.round((r.reduce((n, x) => n + x.score, 0) / r.length) * 100) : null,
                cards: reviews.filter((x) => dayKey(x.reviewed_at) === date).length,
            };
        });
        const scores = attempts.map((a) => a.percentage);
        const first = scores.slice(0, 5);
        const last = scores.slice(-5);
        const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
        const matured = reviews.filter((r) => r.prev_interval >= 1);
        const leaves = flat.filter((t: any) => !flat.some((c) => c.parent_id === t.id) && t.attempts > 0);
        return {
            totals: {
                study_minutes: Math.round(sessions.reduce((n, s) => n + s.duration_sec, 0) / 60),
                questions_answered: responses.length,
                accuracy: responses.length ? Math.round((responses.reduce((n, r) => n + r.score, 0) / responses.length) * 100) : null,
                average_score: avg(scores) !== null ? Math.round(avg(scores)!) : null,
                attempts: attempts.length,
                cards_reviewed: reviews.length,
                retention: matured.length ? Math.round((matured.filter((r) => r.rating !== 'AGAIN').length / matured.length) * 100) : null,
                improvement_rate: first.length >= 2 && last.length >= 2 && attempts.length >= 4 ? Math.round(avg(last)! - avg(first)!) : null,
                recall_average: recalls.length ? Math.round(recalls.reduce((n, r) => n + r.score, 0) / recalls.length) : null,
            },
            daily,
            attempts: attempts.map((a, i) => ({ index: i + 1, id: a.id, title: a.quiz.title, mode: a.quiz.mode, percentage: a.percentage, completed_at: a.completed_at })),
            flashcards: { by_rating: (['AGAIN', 'HARD', 'GOOD', 'EASY'] as const).map((r) => ({ rating: r, count: reviews.filter((x) => x.rating === r).length })) },
            by_difficulty: [1, 2, 3, 4, 5].map((d) => {
                const r = responses.filter((x) => x.difficulty === d);
                return { difficulty: d, total: r.length, accuracy: r.length ? Math.round((r.reduce((n, x) => n + x.score, 0) / r.length) * 100) : null };
            }),
            strong_topics: [...leaves].sort((a, b) => b.mastery - a.mastery).slice(0, 5).map((t) => ({ id: t.id, name: t.name, mastery: t.mastery })),
            weak_topics: [...leaves].sort((a, b) => a.mastery - b.mastery).slice(0, 5).map((t) => ({ id: t.id, name: t.name, mastery: t.mastery })),
            readiness: await this.readiness(userId, projectId),
        };
    }

    // ── User dashboard ──

    async dashboard(userId: string) {
        const { tz, name } = await this.tz(userId);
        const projectIds = await this.access.projectIdsForUser(userId);
        const projects = await this.prisma.project.findMany({ where: { id: { in: projectIds } }, orderBy: { updated_at: 'desc' } });
        const today = localDateKey(tz);
        const weekAgo = DateTime.now().setZone(tz).minus({ days: 6 }).toISODate() as string;
        const [session, counts, activityWeek, attempts, profile] = await Promise.all([
            this.dailySession(userId),
            this.flashcards.counts(userId, projectIds),
            this.prisma.dailyActivity.findMany({ where: { user_id: userId, date: { gte: weekAgo, lte: today } } }),
            this.prisma.quizAttempt.findMany({
                where: { user_id: userId, status: AttemptStatus.COMPLETED },
                orderBy: { completed_at: 'desc' },
                take: 8,
                include: { quiz: { select: { title: true, mode: true } } },
            }),
            this.gamification.profile(userId),
        ]);
        const perProject = await Promise.all(
            projects.slice(0, 8).map(async (p) => {
                const [readiness, flat, due] = await Promise.all([
                    this.readiness(userId, p.id),
                    this.topics.flatMastery(userId, p.id),
                    this.prisma.cardState.count({ where: { user_id: userId, project_id: p.id, due_at: { lte: new Date() } } }),
                ]);
                const leaves = flat.filter((t: any) => !flat.some((c) => c.parent_id === t.id));
                return {
                    id: p.id,
                    title: p.title,
                    subject: p.subject,
                    exam_date: p.exam_date,
                    days_to_exam: p.exam_date ? Math.ceil((p.exam_date.getTime() - Date.now()) / 86_400_000) : null,
                    progress: leaves.length ? Math.round(leaves.reduce((s, t) => s + t.mastery, 0) / leaves.length) : 0,
                    readiness: readiness.score,
                    cards_due: due,
                    weak_topics: leaves.filter((t) => t.attempts > 0 && t.mastery < 60).sort((a, b) => a.mastery - b.mastery).slice(0, 3).map((t) => ({ id: t.id, name: t.name, mastery: t.mastery, project_id: p.id })),
                };
            }),
        );
        const accuracySince = new Date(Date.now() - 30 * 86_400_000);
        const acc = await this.prisma.questionResponse.aggregate({ where: { user_id: userId, answered_at: { gte: accuracySince } }, _avg: { score: true }, _count: { _all: true } });
        const todayAct = activityWeek.find((a) => a.date === today);
        const focus = perProject.find((p) => p.id === session.focus_project?.id) ?? perProject[0];
        const hour = DateTime.now().setZone(tz).hour;
        return {
            greeting: this.i18n.t(await this.i18n.languageOf(userId), hour < 12 ? 'greeting.morning' : hour < 18 ? 'greeting.afternoon' : 'greeting.evening', { name: name.split(' ')[0] }),
            today: {
                session,
                goal_progress: Math.min(100, Math.round(((todayAct?.minutes_studied ?? 0) / Math.max(1, profile.daily_goal.minutes)) * 100)),
                minutes: todayAct?.minutes_studied ?? 0,
            },
            gamification: profile,
            flashcards_due: counts.due,
            quiz_accuracy: acc._count._all ? Math.round((acc._avg.score ?? 0) * 100) : null,
            exam_readiness: focus?.readiness ?? null,
            study_time: { today_min: todayAct?.minutes_studied ?? 0, week_min: activityWeek.reduce((n, a) => n + a.minutes_studied, 0) },
            active_projects: perProject.filter((p) => !projects.find((x) => x.id === p.id)?.archived_at),
            upcoming_exams: perProject.filter((p) => p.days_to_exam !== null && p.days_to_exam >= 0).sort((a, b) => a.days_to_exam! - b.days_to_exam!).slice(0, 5),
            recent_scores: attempts.map((a) => ({ id: a.id, project_id: a.project_id, quiz_title: a.quiz.title, mode: a.quiz.mode, percentage: a.percentage, completed_at: a.completed_at })),
            weak_topics: perProject.flatMap((p) => p.weak_topics).sort((a, b) => a.mastery - b.mastery).slice(0, 5),
            overall_progress: perProject.length ? Math.round(perProject.reduce((s, p) => s + p.progress, 0) / perProject.length) : 0,
            week: activityWeek.map((a) => ({ date: a.date, minutes: a.minutes_studied, xp: a.xp_earned, goal_met: a.goal_met })),
        };
    }
}
