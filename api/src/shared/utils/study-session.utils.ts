import { StudyActivityType } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';

/**
 * Records study time for analytics, merging with a recent session of the same type (within 10 minutes)
 * so frequent small activities (card reviews, tutor messages) don't create thousands of rows.
 */
export const recordStudySession = async (
    prisma: PrismaService,
    userId: string,
    projectId: string | null,
    type: StudyActivityType,
    seconds: number,
): Promise<void> => {
    const secs = Math.max(0, Math.min(3 * 3600, Math.round(seconds)));
    if (!secs) return;
    const recent = await prisma.studySession.findFirst({
        where: { user_id: userId, project_id: projectId, type, ended_at: { gte: new Date(Date.now() - 10 * 60_000) } },
        orderBy: { ended_at: 'desc' },
    });
    if (recent) {
        await prisma.studySession.update({ where: { id: recent.id }, data: { ended_at: new Date(), duration_sec: { increment: secs }, items_done: { increment: 1 } } });
        return;
    }
    await prisma.studySession.create({
        data: { user_id: userId, project_id: projectId, type, started_at: new Date(Date.now() - secs * 1000), ended_at: new Date(), duration_sec: secs, items_done: 1 },
    });
};
