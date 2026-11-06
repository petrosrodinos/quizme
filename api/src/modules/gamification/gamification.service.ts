import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AttemptStatus, Prisma, QuizMode } from 'generated/prisma';
import { DateTime } from 'luxon';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { RealtimeEvents, RealtimeService } from '@/core/realtime/realtime.service';
import {
    CardReviewedEvent,
    DomainEvents,
    QuestionAnsweredEvent,
    QuizCompletedEvent,
    RecallEvaluatedEvent,
    SimpleUserEvent,
    StudyTimeLoggedEvent,
    TopicMasteredEvent,
} from '@/shared/events/domain-events';
import { DomainEventsService } from '@/shared/events/domain-events.service';
import { AppPaths } from '@/shared/config/app-urls';
import { addDaysKey, localDateKey, safeZone } from '@/shared/utils/date.utils';
import { NotificationsService, NotificationTypes } from '../notifications/notifications.service';
import { I18nService, msg } from '@/shared/i18n/i18n.service';
import { Lang } from '@/shared/i18n/messages';
import { ACHIEVEMENTS_EL } from '@/shared/i18n/achievements.el';
import {
    ACHIEVEMENTS,
    AchievementMetric,
    comboMultiplier,
    DailyGoals,
    DailyGoalType,
    difficultyScale,
    levelFromXp,
    levelTitle,
    MAX_STREAK_FREEZES,
    XpRules,
} from './gamification.config';

/** Metrics stored as counters on UserAchievement.progress (event-driven flags) rather than computed from history. */
const COUNTER_METRICS: AchievementMetric[] = ['early_bird', 'weekend_warrior', 'exam_beat_previous', 'exam_ready', 'socratic_sessions', 'rooms_joined', 'games_won', 'shares'];

/**
 * Gamification domain: listens to learning events (never embedded in feature logic), keeps an immutable XP ledger,
 * computes levels/streaks/daily goals, evaluates data-driven achievements and pushes realtime celebrations.
 */
@Injectable()
export class GamificationService implements OnModuleInit {
    private readonly logger = new Logger(GamificationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DomainEventsService,
        private readonly realtime: RealtimeService,
        private readonly notifications: NotificationsService,
        private readonly i18n: I18nService,
    ) { }

    private achievementText(lang: Lang, def: { key: string; title: string; description: string }) {
        return lang === 'el' && ACHIEVEMENTS_EL[def.key] ? ACHIEVEMENTS_EL[def.key] : { title: def.title, description: def.description };
    }

    private levelName(lang: Lang, level: number) {
        return this.i18n.t(lang, `level.${levelTitle(level)}`);
    }

    async onModuleInit() {
        await this.seedAchievements().catch((e) => this.logger.error(`Achievement seed failed: ${e?.message}`));
        this.events.on<QuestionAnsweredEvent>(DomainEvents.QUESTION_ANSWERED, (e) => this.onQuestionAnswered(e));
        this.events.on<QuizCompletedEvent>(DomainEvents.QUIZ_COMPLETED, (e) => this.onQuizCompleted(e));
        this.events.on<CardReviewedEvent>(DomainEvents.CARD_REVIEWED, (e) => this.onCardReviewed(e));
        this.events.on<RecallEvaluatedEvent>(DomainEvents.RECALL_EVALUATED, (e) => this.onRecall(e));
        this.events.on<TopicMasteredEvent>(DomainEvents.TOPIC_MASTERED, (e) => this.onTopicMastered(e));
        this.events.on<StudyTimeLoggedEvent>(DomainEvents.STUDY_TIME_LOGGED, (e) => this.onStudyTime(e));
        this.events.on<SimpleUserEvent>(DomainEvents.DAILY_SESSION_COMPLETED, (e) => this.onDailySession(e));
        this.events.on<SimpleUserEvent>(DomainEvents.ROOM_JOINED, (e) => this.bump(e.userId, 'rooms_joined'));
        this.events.on<SimpleUserEvent>(DomainEvents.GAME_WON, (e) => this.bump(e.userId, 'games_won'));
        this.events.on<SimpleUserEvent>(DomainEvents.CONTENT_SHARED, (e) => this.bump(e.userId, 'shares'));
    }

    private async seedAchievements() {
        for (const [i, a] of ACHIEVEMENTS.entries()) {
            const data = {
                title: a.title,
                description: a.description,
                icon: a.icon,
                category: a.category,
                rarity: a.rarity,
                criteria: a.criteria as unknown as Prisma.InputJsonValue,
                hidden: !!a.hidden,
                order_index: i,
            };
            await this.prisma.achievement.upsert({ where: { key: a.key }, create: { key: a.key, ...data }, update: data });
        }
    }

    private async state(userId: string) {
        return this.prisma.userGamification.upsert({ where: { user_id: userId }, create: { user_id: userId }, update: {} });
    }

    private async timezone(userId: string) {
        const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
        return safeZone(u?.timezone);
    }

    // ── XP ledger ──

    async grantXp(userId: string, projectId: string | null | undefined, sourceType: string, sourceId: string | null, base: number, multiplier = 1) {
        const amount = Math.round(base * multiplier);
        if (amount <= 0) return 0;
        const tz = await this.timezone(userId);
        const date = localDateKey(tz);
        const before = await this.state(userId);
        await this.prisma.$transaction([
            this.prisma.xpEvent.create({ data: { user_id: userId, project_id: projectId ?? null, source_type: sourceType, source_id: sourceId, amount, multiplier } }),
            this.prisma.dailyActivity.upsert({
                where: { user_id_date: { user_id: userId, date } },
                create: { user_id: userId, date, xp_earned: amount },
                update: { xp_earned: { increment: amount } },
            }),
        ]);
        // Atomic increment (concurrent grants never lose XP); the level-up is claimed with a conditional update.
        const updated = await this.prisma.userGamification.update({ where: { user_id: userId }, data: { total_xp: { increment: amount } } });
        const total = updated.total_xp;
        const { level } = levelFromXp(total);
        this.realtime.toUser(userId, RealtimeEvents.XP_GAINED, { amount, total_xp: total, source_type: sourceType, source_id: sourceId, multiplier });
        if (level > updated.level) {
            const claimed = await this.prisma.userGamification.updateMany({ where: { user_id: userId, level: { lt: level } }, data: { level } });
            if (claimed.count === 1 && level > before.level) {
                const lang = await this.i18n.languageOf(userId);
                this.realtime.toUser(userId, RealtimeEvents.LEVEL_UP, { level, level_title: this.levelName(lang, level), level_key: levelTitle(level) });
            }
        }
        await this.checkDailyGoal(userId, tz, date);
        return amount;
    }

    private async onQuestionAnswered(e: QuestionAnsweredEvent) {
        const tz = await this.timezone(e.userId);
        const date = localDateKey(tz);
        await this.prisma.dailyActivity.upsert({
            where: { user_id_date: { user_id: e.userId, date } },
            create: { user_id: e.userId, date, questions_answered: 1, questions_correct: e.isCorrect ? 1 : 0 },
            update: { questions_answered: { increment: 1 }, questions_correct: { increment: e.isCorrect ? 1 : 0 } },
        });
        if (e.isCorrect) {
            // Anti-farming: re-answering the same question correctly within the window earns nothing.
            const recent = await this.prisma.xpEvent.findFirst({
                where: {
                    user_id: e.userId,
                    source_type: 'question_answer',
                    source_id: { endsWith: `:${e.questionId}` },
                    created_at: { gte: new Date(Date.now() - XpRules.SAME_QUESTION_WINDOW_MIN * 60_000) },
                },
                select: { id: true },
            });
            if (!recent) {
                const base = XpRules.CORRECT_ANSWER_BASE * difficultyScale(e.difficulty) + (e.previouslyMissed ? XpRules.COMEBACK_BONUS : 0);
                await this.grantXp(e.userId, e.projectId, 'question_answer', `${e.attemptId ?? 'free'}:${e.questionId}`, base, e.isExam ? 1 : comboMultiplier(e.combo));
            }
        }
        await this.evaluate(e.userId, ['questions_answered', 'best_combo', 'fixed_wrong']);
    }

    private async onQuizCompleted(e: QuizCompletedEvent) {
        const recentSameQuiz = await this.prisma.quizAttempt.count({
            where: {
                user_id: e.userId,
                quiz_id: e.quizId,
                status: AttemptStatus.COMPLETED,
                id: { not: e.attemptId },
                completed_at: { gte: new Date(Date.now() - XpRules.SAME_QUIZ_COMPLETION_WINDOW_MIN * 60_000) },
            },
        });
        if (e.total >= 3 && !recentSameQuiz) {
            await this.grantXp(e.userId, e.projectId, e.isExam ? 'exam_completed' : 'quiz_completed', e.attemptId, e.isExam ? XpRules.EXAM_COMPLETED : XpRules.QUIZ_COMPLETED);
            if (e.percentage >= 100) await this.grantXp(e.userId, e.projectId, 'perfect_quiz', `${e.attemptId}:perfect`, XpRules.PERFECT_QUIZ_BONUS);
        }
        if (e.isExam && e.previousBestExam !== null && e.previousBestExam !== undefined && e.percentage > e.previousBestExam) await this.bump(e.userId, 'exam_beat_previous');
        const project = await this.prisma.project.findUnique({ where: { id: e.projectId }, select: { title: true } });
        await this.notifications.notify({
            userId: e.userId,
            type: NotificationTypes.QUIZ_COMPLETED,
            title: msg(e.isExam ? 'notif.examCompleted.title' : 'notif.quizCompleted.title', { percent: Math.round(e.percentage) }),
            body: msg('notif.quizCompleted.body', { correct: e.correct, total: e.total, project: project?.title ?? '' }),
            link: AppPaths.attempt(e.projectId, e.attemptId),
        });
        await this.evaluate(e.userId, ['perfect_quizzes', 'exams_completed']);
    }

    private async onCardReviewed(e: CardReviewedEvent) {
        const tz = await this.timezone(e.userId);
        const date = localDateKey(tz);
        await this.prisma.dailyActivity.upsert({
            where: { user_id_date: { user_id: e.userId, date } },
            create: { user_id: e.userId, date, cards_reviewed: 1 },
            update: { cards_reviewed: { increment: 1 } },
        });
        const recent = await this.prisma.xpEvent.findFirst({
            where: { user_id: e.userId, source_type: 'card_review', source_id: `card:${e.cardId}`, created_at: { gte: new Date(Date.now() - XpRules.SAME_CARD_WINDOW_MIN * 60_000) } },
            select: { id: true },
        });
        if (!recent) {
            const base = e.rating === 'GOOD' || e.rating === 'EASY' ? XpRules.CARD_GOOD_EASY : XpRules.CARD_AGAIN_HARD;
            await this.grantXp(e.userId, e.projectId, 'card_review', `card:${e.cardId}`, base);
        }
        await this.evaluate(e.userId, ['cards_reviewed']);
    }

    private async onRecall(e: RecallEvaluatedEvent) {
        if (e.score >= XpRules.RECALL_THRESHOLD) await this.grantXp(e.userId, e.projectId, e.mode === 'TEACH_BACK' ? 'teach_back' : 'active_recall', e.recallId, XpRules.RECALL_HIGH_SCORE);
        await this.evaluate(e.userId, ['teach_backs', 'recalls']);
    }

    private async onTopicMastered(e: TopicMasteredEvent) {
        await this.grantXp(e.userId, e.projectId, 'topic_mastered', e.topicId, XpRules.TOPIC_MASTERED);
        await this.evaluate(e.userId, ['topics_mastered', 'project_mastered']);
    }

    private async onDailySession(e: SimpleUserEvent) {
        const tz = await this.timezone(e.userId);
        const date = localDateKey(tz);
        const already = await this.prisma.xpEvent.findFirst({ where: { user_id: e.userId, source_type: 'daily_session', source_id: date }, select: { id: true } });
        if (!already) await this.grantXp(e.userId, e.projectId, 'daily_session', date, XpRules.DAILY_SESSION);
    }

    private async onStudyTime(e: StudyTimeLoggedEvent) {
        const seconds = Math.max(0, Math.min(e.seconds, 3 * 3600));
        if (!seconds) return;
        const tz = await this.timezone(e.userId);
        const date = localDateKey(tz);
        const minutes = Math.max(1, Math.round(seconds / 60));
        await this.prisma.dailyActivity.upsert({
            where: { user_id_date: { user_id: e.userId, date } },
            create: { user_id: e.userId, date, minutes_studied: minutes },
            update: { minutes_studied: { increment: minutes } },
        });
        const local = DateTime.now().setZone(tz);
        if (local.hour < 8 && local.hour >= 4) await this.bump(e.userId, 'early_bird');
        if (local.weekday === 7) {
            const saturday = addDaysKey(date, -1);
            const sat = await this.prisma.dailyActivity.findUnique({ where: { user_id_date: { user_id: e.userId, date: saturday } } });
            if (sat && sat.minutes_studied > 0) await this.bump(e.userId, 'weekend_warrior');
        }
        await this.checkDailyGoal(e.userId, tz, date);
    }

    // ── Daily goal & streaks ──

    private async checkDailyGoal(userId: string, tz: string, date: string) {
        const [g, activity] = await Promise.all([
            this.state(userId),
            this.prisma.dailyActivity.findUnique({ where: { user_id_date: { user_id: userId, date } } }),
        ]);
        if (!activity || activity.goal_met) return;
        const met = activity.minutes_studied >= g.daily_goal_minutes || activity.xp_earned >= g.daily_goal_xp;
        if (!met) return;
        const claimed = await this.prisma.dailyActivity.updateMany({ where: { user_id: userId, date, goal_met: false }, data: { goal_met: true } });
        if (!claimed.count) return;

        let streak = g.current_streak;
        let freezes = g.streak_freezes;
        const yesterday = addDaysKey(date, -1);
        if (g.last_goal_date === date) return;
        if (!g.last_goal_date || g.last_goal_date === yesterday) streak += 1;
        else {
            const missed = Math.round(DateTime.fromISO(date).diff(DateTime.fromISO(g.last_goal_date), 'days').days) - 1;
            if (missed > 0 && missed <= freezes) {
                freezes -= missed;
                streak += 1;
                for (let i = 1; i <= missed; i++) {
                    const d = addDaysKey(g.last_goal_date, i);
                    await this.prisma.dailyActivity.upsert({
                        where: { user_id_date: { user_id: userId, date: d } },
                        create: { user_id: userId, date: d, freeze_used: true },
                        update: { freeze_used: true },
                    });
                }
            } else streak = 1;
        }
        if (streak > 0 && streak % 7 === 0) freezes = Math.min(MAX_STREAK_FREEZES, freezes + 1);
        await this.prisma.userGamification.update({
            where: { user_id: userId },
            data: { current_streak: streak, longest_streak: Math.max(g.longest_streak, streak), streak_freezes: freezes, last_goal_date: date },
        });
        this.realtime.toUser(userId, RealtimeEvents.DAILY_GOAL_MET, { date, minutes: activity.minutes_studied, xp: activity.xp_earned });
        this.realtime.toUser(userId, RealtimeEvents.STREAK_UPDATED, { current_streak: streak, streak_freezes: freezes });
        await this.notifications.notify({ userId, type: NotificationTypes.GOAL, title: msg('notif.goal.title'), body: msg('notif.goal.body', { count: streak }), link: AppPaths.dashboard });
        await this.evaluate(userId, ['streak']);
    }

    /** Effective streak for display: broken streaks (missed days beyond available freezes) show as 0. */
    private effectiveStreak(g: { current_streak: number; last_goal_date: string | null; streak_freezes: number }, today: string) {
        if (!g.last_goal_date) return 0;
        if (g.last_goal_date === today || g.last_goal_date === addDaysKey(today, -1)) return g.current_streak;
        const missed = Math.round(DateTime.fromISO(today).diff(DateTime.fromISO(g.last_goal_date), 'days').days) - 1;
        return missed <= g.streak_freezes ? g.current_streak : 0;
    }

    async setDailyGoal(userId: string, type: DailyGoalType, minutes?: number, xp?: number) {
        let goalMinutes: number;
        if (type === 'CUSTOM') {
            if (!minutes && !xp) throw new BadRequestException('Provide minutes or xp for a custom goal');
            goalMinutes = Math.min(480, Math.max(5, minutes ?? Math.round((xp ?? 100) / 5)));
        } else goalMinutes = DailyGoals[type];
        const goalXp = type === 'CUSTOM' && xp ? Math.min(5000, Math.max(20, xp)) : goalMinutes * 5;
        await this.prisma.userGamification.upsert({
            where: { user_id: userId },
            create: { user_id: userId, daily_goal_type: type, daily_goal_minutes: goalMinutes, daily_goal_xp: goalXp },
            update: { daily_goal_type: type, daily_goal_minutes: goalMinutes, daily_goal_xp: goalXp },
        });
        return this.profile(userId);
    }

    async profile(userId: string) {
        const g = await this.state(userId);
        const tz = await this.timezone(userId);
        const today = localDateKey(tz);
        const activity = await this.prisma.dailyActivity.findUnique({ where: { user_id_date: { user_id: userId, date: today } } });
        const lv = levelFromXp(g.total_xp);
        return {
            total_xp: g.total_xp,
            level: lv.level,
            level_title: this.levelName(await this.i18n.languageOf(userId), lv.level),
            level_key: levelTitle(lv.level),
            xp_into_level: lv.xpIntoLevel,
            xp_for_next_level: lv.xpForNext,
            current_streak: this.effectiveStreak(g, today),
            longest_streak: g.longest_streak,
            streak_freezes: g.streak_freezes,
            streak_extended_today: g.last_goal_date === today,
            daily_goal: {
                type: g.daily_goal_type,
                minutes: g.daily_goal_minutes,
                xp: g.daily_goal_xp,
                progress_minutes: activity?.minutes_studied ?? 0,
                progress_xp: activity?.xp_earned ?? 0,
                met: !!activity?.goal_met,
            },
        };
    }

    async activity(userId: string, days: number) {
        const tz = await this.timezone(userId);
        const today = localDateKey(tz);
        const from = addDaysKey(today, -(days - 1));
        const rows = await this.prisma.dailyActivity.findMany({ where: { user_id: userId, date: { gte: from, lte: today } }, orderBy: { date: 'asc' } });
        const map = new Map(rows.map((r) => [r.date, r]));
        return Array.from({ length: days }, (_, i) => {
            const date = addDaysKey(from, i);
            const r = map.get(date);
            return {
                date,
                xp_earned: r?.xp_earned ?? 0,
                minutes_studied: r?.minutes_studied ?? 0,
                questions_answered: r?.questions_answered ?? 0,
                questions_correct: r?.questions_correct ?? 0,
                cards_reviewed: r?.cards_reviewed ?? 0,
                goal_met: r?.goal_met ?? false,
                freeze_used: r?.freeze_used ?? false,
            };
        });
    }

    // ── Achievements ──

    async bump(userId: string, metric: AchievementMetric, amount = 1) {
        const defs = await this.prisma.achievement.findMany({ where: { criteria: { path: ['metric'], equals: metric } } });
        for (const def of defs) {
            const existing = await this.prisma.userAchievement.findUnique({ where: { user_id_achievement_id: { user_id: userId, achievement_id: def.id } } });
            if (existing?.unlocked_at) continue;
            const progress = (existing?.progress ?? 0) + amount;
            await this.applyProgress(userId, def, progress);
        }
    }

    private async metricValue(userId: string, metric: AchievementMetric): Promise<number> {
        switch (metric) {
            case 'streak':
                return (await this.state(userId)).current_streak;
            case 'questions_answered':
                return this.prisma.questionResponse.count({ where: { user_id: userId } });
            case 'cards_reviewed':
                return this.prisma.reviewLog.count({ where: { user_id: userId } });
            case 'perfect_quizzes':
                return this.prisma.quizAttempt.count({ where: { user_id: userId, status: AttemptStatus.COMPLETED, percentage: { gte: 100 }, max_score: { gte: 3 } } });
            case 'best_combo':
                return (await this.prisma.quizAttempt.aggregate({ where: { user_id: userId }, _max: { best_combo: true } }))._max.best_combo ?? 0;
            case 'fixed_wrong': {
                const rows = await this.prisma.questionResponse.findMany({ where: { user_id: userId }, select: { question_id: true, is_correct: true }, orderBy: { answered_at: 'asc' }, take: 5000 });
                const missed = new Set<string>();
                const fixed = new Set<string>();
                for (const r of rows) {
                    if (!r.is_correct) missed.add(r.question_id);
                    else if (missed.has(r.question_id)) fixed.add(r.question_id);
                }
                return fixed.size;
            }
            case 'topics_mastered':
                return this.prisma.topicMastery.count({ where: { user_id: userId, mastered_at: { not: null } } });
            case 'project_mastered': {
                const projects = await this.prisma.topicMastery.groupBy({ by: ['project_id'], where: { user_id: userId, mastered_at: { not: null } }, _count: { _all: true } });
                for (const p of projects) {
                    const total = await this.prisma.topic.count({ where: { project_id: p.project_id, children: { none: {} } } });
                    if (total >= 3 && p._count._all >= total) return 1;
                }
                return 0;
            }
            case 'exams_completed':
                return this.prisma.quizAttempt.count({ where: { user_id: userId, status: AttemptStatus.COMPLETED, quiz: { mode: QuizMode.EXAM } } });
            case 'teach_backs':
                return this.prisma.recallAttempt.count({ where: { user_id: userId, mode: 'TEACH_BACK' } });
            case 'recalls':
                return this.prisma.recallAttempt.count({ where: { user_id: userId, mode: 'ACTIVE_RECALL' } });
            default:
                return -1;
        }
    }

    async evaluate(userId: string, metrics: AchievementMetric[]) {
        try {
            const defs = await this.prisma.achievement.findMany();
            const unlocked = new Set(
                (await this.prisma.userAchievement.findMany({ where: { user_id: userId, unlocked_at: { not: null } }, select: { achievement_id: true } })).map((u) => u.achievement_id),
            );
            const values = new Map<AchievementMetric, number>();
            for (const def of defs) {
                const c = def.criteria as { metric: AchievementMetric; target: number };
                if (!metrics.includes(c.metric) || COUNTER_METRICS.includes(c.metric) || unlocked.has(def.id)) continue;
                if (!values.has(c.metric)) values.set(c.metric, await this.metricValue(userId, c.metric));
                await this.applyProgress(userId, def, values.get(c.metric)!);
            }
        } catch (error) {
            this.logger.warn(`Achievement evaluation failed: ${error?.message}`);
        }
    }

    private async applyProgress(userId: string, def: { id: string; key: string; title: string; description: string; icon: string; rarity: string; criteria: Prisma.JsonValue }, value: number) {
        const target = (def.criteria as { target: number }).target;
        const progress = Math.min(value, target);
        const unlock = value >= target;
        await this.prisma.userAchievement.upsert({
            where: { user_id_achievement_id: { user_id: userId, achievement_id: def.id } },
            create: { user_id: userId, achievement_id: def.id, progress },
            update: { progress },
        });
        if (!unlock) return;
        // Atomic claim: concurrent evaluations (multiple tabs/events) unlock and celebrate exactly once.
        const claimed = await this.prisma.userAchievement.updateMany({
            where: { user_id: userId, achievement_id: def.id, unlocked_at: null },
            data: { unlocked_at: new Date() },
        });
        if (claimed.count === 1) {
            const lang = await this.i18n.languageOf(userId);
            const text = this.achievementText(lang, def);
            this.realtime.toUser(userId, RealtimeEvents.ACHIEVEMENT_UNLOCKED, { key: def.key, title: text.title, description: text.description, icon: def.icon, rarity: def.rarity });
            await this.notifications.notify({ userId, type: NotificationTypes.ACHIEVEMENT, title: msg('notif.achievement.title', { title: text.title }), body: text.description, link: AppPaths.achievements });
        }
    }

    async achievements(userId: string) {
        const lang = await this.i18n.languageOf(userId);
        const [defs, mine] = await Promise.all([
            this.prisma.achievement.findMany({ orderBy: { order_index: 'asc' } }),
            this.prisma.userAchievement.findMany({ where: { user_id: userId } }),
        ]);
        const byId = new Map(mine.map((m) => [m.achievement_id, m]));
        return defs.map((d) => {
            const m = byId.get(d.id);
            const c = d.criteria as { metric: string; target: number };
            const unlocked = !!m?.unlocked_at;
            const secret = d.hidden && !unlocked;
            return {
                key: d.key,
                title: secret ? this.i18n.t(lang, 'achievement.secret.title') : this.achievementText(lang, d).title,
                description: secret ? this.i18n.t(lang, 'achievement.secret.description') : this.achievementText(lang, d).description,
                icon: secret ? 'lock' : d.icon,
                category: d.category,
                rarity: d.rarity,
                hidden: d.hidden,
                target: c.target,
                progress: m?.progress ?? 0,
                unlocked,
                unlocked_at: m?.unlocked_at ?? null,
            };
        });
    }

    /** Called by the study module when readiness crosses 90%. */
    async markExamReady(userId: string) {
        await this.bump(userId, 'exam_ready');
    }

    // ── Leaderboards (opt-in, weekly, per project) ──

    async leaderboard(userId: string, projectId: string) {
        const tz = await this.timezone(userId);
        const weekStart = DateTime.now().setZone(tz).startOf('week').toJSDate();
        const members = await this.prisma.projectMember.findMany({
            where: { project_id: projectId },
            include: { user: { select: { id: true, full_name: true, email: true, avatar_url: true, preferences: { select: { leaderboard_opt_in: true } } } } },
        });
        const visible = members.filter((m) => m.user_id === userId || m.user.preferences?.leaderboard_opt_in);
        const sums = await this.prisma.xpEvent.groupBy({
            by: ['user_id'],
            where: { project_id: projectId, created_at: { gte: weekStart }, user_id: { in: visible.map((v) => v.user_id) } },
            _sum: { amount: true },
        });
        const xp = new Map(sums.map((s) => [s.user_id, s._sum.amount ?? 0]));
        const me = members.find((m) => m.user_id === userId);
        return {
            week_start: weekStart,
            opted_in: !!me?.user.preferences?.leaderboard_opt_in,
            entries: visible
                .map((m) => ({ user_id: m.user_id, name: m.user.full_name || m.user.email.split('@')[0], avatar_url: m.user.avatar_url, xp: xp.get(m.user_id) ?? 0, is_me: m.user_id === userId }))
                .sort((a, b) => b.xp - a.xp)
                .map((e, i) => ({ ...e, rank: i + 1 })),
        };
    }
}
