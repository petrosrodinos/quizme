import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';

/** Ensures an optional lesson id belongs to the project; returns it (or null) ready to store as `lesson_id`. */
export async function resolveLessonId(prisma: PrismaService, projectId: string, lessonId?: string | null): Promise<string | null> {
    if (!lessonId) return null;
    const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, project_id: projectId }, select: { id: true } });
    if (!lesson) throw new BadRequestException('Lesson not found in this project');
    return lesson.id;
}
