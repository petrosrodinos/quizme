import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from 'generated/prisma';
import { DateTime } from 'luxon';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { RealtimeEvents, RealtimeService } from '@/core/realtime/realtime.service';
import { MailService } from '@/integrations/notifications/mail/mail.service';
import { AppPaths } from '@/shared/config/app-urls';
import { localDateKey, safeZone } from '@/shared/utils/date.utils';
import { paginate } from '@/shared/utils/pagination.utils';
import { DEFAULT_NOTIFICATION_PREFS } from '../users/users.service';
import { I18nService, Msg, msg } from '@/shared/i18n/i18n.service';

export const NotificationTypes = {
    STUDY_REMINDER: 'study_reminder',
    FLASHCARDS_DUE: 'flashcards_due',
    INVITATION: 'invitation',
    COLLABORATION: 'collaboration',
    QUIZ_COMPLETED: 'quiz_completed',
    GOAL: 'goal',
    EXAM_UPCOMING: 'exam_upcoming',
    STREAK_RISK: 'streak_risk',
    ACHIEVEMENT: 'achievement',
    DOCUMENT: 'document',
} as const;
export type NotificationType = (typeof NotificationTypes)[keyof typeof NotificationTypes];

/** Notification type → user preference toggle. */
const PREF_KEY: Record<NotificationType, keyof typeof DEFAULT_NOTIFICATION_PREFS> = {
    study_reminder: 'study_reminders',
    flashcards_due: 'flashcards_due',
    invitation: 'invitations',
    collaboration: 'collaboration',
    quiz_completed: 'quiz_completion',
    goal: 'goals',
    exam_upcoming: 'exams',
    streak_risk: 'streak_risk',
    achievement: 'achievements',
    document: 'collaboration',
};

export interface NotifyInput {
    userId: string;
    type: NotificationType;
    /** Literal text or a catalogue message (rendered in the recipient's language). */
    title: Msg;
    body?: Msg;
    link?: string;
    data?: Record<string, unknown>;
    /** Send an email as well when the user enabled email notifications (or always for invitations). */
    email?: { forceSend?: boolean; ctaLabel?: string; url?: string };
}

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly realtime: RealtimeService,
        private readonly mail: MailService,
        private readonly i18n: I18nService,
    ) { }

    async notify(input: NotifyInput) {
        const prefsRow = await this.prisma.userPreferences.findUnique({ where: { user_id: input.userId } });
        const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...((prefsRow?.notification_prefs as object) ?? {}) } as Record<string, boolean>;
        if (prefs[PREF_KEY[input.type]] === false) return null;
        const lang = await this.i18n.languageOf(input.userId);
        const title = this.i18n.render(lang, input.title)!;
        const body = this.i18n.render(lang, input.body);
        const n = await this.prisma.notification.create({
            data: {
                user_id: input.userId,
                type: input.type,
                title,
                body,
                link: input.link,
                data: (input.data ?? undefined) as Prisma.InputJsonValue,
            },
        });
        this.realtime.toUser(input.userId, RealtimeEvents.NOTIFICATION, n);
        if (input.email && (input.email.forceSend || prefs.email)) {
            setImmediate(async () => {
                try {
                    const user = await this.prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } });
                    if (user)
                        await this.mail.send({
                            to: user.email,
                            subject: title,
                            heading: title,
                            body: body ?? '',
                            footer: this.i18n.t(lang, 'email.footer'),
                            cta: input.email?.url ? { label: input.email.ctaLabel ?? this.i18n.t(lang, 'email.notification.cta'), url: input.email.url } : undefined,
                        });
                } catch (error) {
                    this.logger.warn(`Notification email failed: ${error?.message}`);
                }
            });
        }
        return n;
    }

    /** Sends at most one notification of the given type per user per local day. */
    private async notifyOncePerDay(input: NotifyInput, timezone: string) {
        const start = DateTime.now().setZone(safeZone(timezone)).startOf('day').toJSDate();
        const exists = await this.prisma.notification.findFirst({ where: { user_id: input.userId, type: input.type, created_at: { gte: start } }, select: { id: true } });
        if (!exists) await this.notify(input);
    }

    async list(userId: string, page: number, limit: number, unreadOnly: boolean) {
        const where: Prisma.NotificationWhereInput = { user_id: userId, ...(unreadOnly ? { read_at: null } : {}) };
        const [items, total] = await Promise.all([
            this.prisma.notification.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * limit, take: limit }),
            this.prisma.notification.count({ where }),
        ]);
        return paginate(items, total, page, limit);
    }

    async unreadCount(userId: string) {
        return { count: await this.prisma.notification.count({ where: { user_id: userId, read_at: null } }) };
    }

    async markRead(userId: string, id: string) {
        await this.prisma.notification.updateMany({ where: { id, user_id: userId, read_at: null }, data: { read_at: new Date() } });
        return { success: true };
    }

    async markAllRead(userId: string) {
        const res = await this.prisma.notification.updateMany({ where: { user_id: userId, read_at: null }, data: { read_at: new Date() } });
        return { updated: res.count };
    }

    async remove(userId: string, id: string) {
        await this.prisma.notification.deleteMany({ where: { id, user_id: userId } });
        return { success: true };
    }

    // ── Scheduled reminders (hourly; each respects the user's local time and sends at most once per day) ──

    @Cron(CronExpression.EVERY_HOUR)
    async hourlyReminders() {
        try {
            const users = await this.prisma.user.findMany({
                where: { memberships: { some: {} } },
                select: { id: true, timezone: true, gamification: { select: { current_streak: true, last_goal_date: true } } },
                take: 5000,
            });
            for (const u of users) {
                const local = DateTime.now().setZone(safeZone(u.timezone));
                const today = localDateKey(u.timezone);
                if (local.hour >= 9 && local.hour < 21) {
                    const due = await this.prisma.cardState.count({ where: { user_id: u.id, due_at: { lte: new Date() } } });
                    if (due >= 5)
                        await this.notifyOncePerDay(
                            { userId: u.id, type: NotificationTypes.FLASHCARDS_DUE, title: msg('notif.flashcardsDue.title', { count: due }), body: msg('notif.flashcardsDue.body'), link: AppPaths.study },
                            u.timezone,
                        );
                }
                if (local.hour >= 19 && (u.gamification?.current_streak ?? 0) > 0 && u.gamification?.last_goal_date !== today) {
                    await this.notifyOncePerDay(
                        { userId: u.id, type: NotificationTypes.STREAK_RISK, title: msg('notif.streakRisk.title', { count: u.gamification!.current_streak }), body: msg('notif.streakRisk.body'), link: AppPaths.study },
                        u.timezone,
                    );
                }
                if (local.hour === 17) {
                    const activity = await this.prisma.dailyActivity.findUnique({ where: { user_id_date: { user_id: u.id, date: today } } });
                    if (!activity || activity.minutes_studied === 0)
                        await this.notifyOncePerDay(
                            { userId: u.id, type: NotificationTypes.STUDY_REMINDER, title: msg('notif.studyReminder.title'), body: msg('notif.studyReminder.body'), link: AppPaths.study },
                            u.timezone,
                        );
                }
                if (local.hour === 10) {
                    const projects = await this.prisma.project.findMany({
                        where: { members: { some: { user_id: u.id } }, archived_at: null, exam_date: { gte: new Date(), lte: new Date(Date.now() + 8 * 86_400_000) } },
                        select: { id: true, title: true, exam_date: true },
                    });
                    for (const p of projects) {
                        const days = Math.ceil((p.exam_date!.getTime() - Date.now()) / 86_400_000);
                        if ([7, 3, 1].includes(days))
                            await this.notify({
                                userId: u.id,
                                type: NotificationTypes.EXAM_UPCOMING,
                                title: msg('notif.examUpcoming.title', { project: p.title, count: days }),
                                body: msg('notif.examUpcoming.body'),
                                link: AppPaths.project(p.id),
                                data: { project_id: p.id, days },
                            });
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Reminder job failed: ${error?.message}`);
        }
    }
}
