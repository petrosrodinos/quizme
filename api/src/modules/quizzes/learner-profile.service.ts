import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';

export interface LearnerProfile {
    answered: number;
    accuracy: number;
    recentAccuracy: number;
    /** Accuracy per difficulty level 1..5 (null when no data). */
    byDifficulty: Record<number, { total: number; accuracy: number | null }>;
    targetDifficulty: number;
    weakConcepts: { concept: string; misses: number; attempts: number }[];
    weakTopicIds: string[];
    missedQuestionIds: string[];
}

/**
 * Builds a learner model from response history: overall/recent accuracy, accuracy by difficulty,
 * repeatedly-missed concepts and weak topics. Drives adaptive quizzes, review, study plans and readiness.
 */
@Injectable()
export class LearnerProfileService {
    constructor(private readonly prisma: PrismaService) { }

    async build(userId: string, projectId: string): Promise<LearnerProfile> {
        const responses = await this.prisma.questionResponse.findMany({
            where: { user_id: userId, project_id: projectId },
            orderBy: { answered_at: 'desc' },
            take: 500,
            select: { is_correct: true, score: true, difficulty: true, question_id: true, answered_at: true, question: { select: { concept: true, topic_id: true } } },
        });
        const answered = responses.length;
        const accuracy = answered ? responses.reduce((s, r) => s + r.score, 0) / answered : 0;
        const recent = responses.slice(0, 30);
        const recentAccuracy = recent.length ? recent.reduce((s, r) => s + r.score, 0) / recent.length : 0;

        const byDifficulty: LearnerProfile['byDifficulty'] = {};
        for (let d = 1; d <= 5; d++) {
            const rs = responses.filter((r) => r.difficulty === d).slice(0, 40);
            byDifficulty[d] = { total: rs.length, accuracy: rs.length ? rs.reduce((s, r) => s + r.score, 0) / rs.length : null };
        }
        // Target difficulty: highest level the learner handles at >= 75%, then step up one; back off when struggling.
        let mastered = 0;
        for (let d = 1; d <= 5; d++) {
            const b = byDifficulty[d];
            if (b.total >= 3 && (b.accuracy ?? 0) >= 0.75) mastered = d;
        }
        let targetDifficulty = answered < 5 ? 2 : Math.min(5, mastered + 1);
        if (recent.length >= 5 && recentAccuracy < 0.5) targetDifficulty = Math.max(1, targetDifficulty - 1);
        if (recent.length >= 10 && recentAccuracy > 0.9) targetDifficulty = Math.min(5, targetDifficulty + 0.5);

        const concepts = new Map<string, { misses: number; attempts: number; lastCorrect: boolean | null }>();
        const topics = new Map<string, { score: number; total: number }>();
        // Latest result per question decides whether it is still "missed".
        const latestByQuestion = new Map<string, boolean>();
        for (const r of responses) {
            if (!latestByQuestion.has(r.question_id)) latestByQuestion.set(r.question_id, r.is_correct);
            const c = r.question.concept;
            if (c) {
                const e = concepts.get(c) ?? { misses: 0, attempts: 0, lastCorrect: null };
                e.attempts++;
                if (!r.is_correct) e.misses++;
                if (e.lastCorrect === null) e.lastCorrect = r.is_correct;
                concepts.set(c, e);
            }
            if (r.question.topic_id) {
                const t = topics.get(r.question.topic_id) ?? { score: 0, total: 0 };
                t.score += r.score;
                t.total++;
                topics.set(r.question.topic_id, t);
            }
        }
        const weakConcepts = [...concepts.entries()]
            .filter(([, v]) => v.misses >= 1 && (v.misses / v.attempts >= 0.4 || v.lastCorrect === false))
            .sort((a, b) => b[1].misses - a[1].misses || b[1].misses / b[1].attempts - a[1].misses / a[1].attempts)
            .slice(0, 10)
            .map(([concept, v]) => ({ concept, misses: v.misses, attempts: v.attempts }));
        const weakTopicIds = [...topics.entries()]
            .filter(([, v]) => v.total >= 2)
            .sort((a, b) => a[1].score / a[1].total - b[1].score / b[1].total)
            .filter(([, v]) => v.score / v.total < 0.75)
            .slice(0, 4)
            .map(([id]) => id);
        const missedQuestionIds = [...latestByQuestion.entries()].filter(([, ok]) => !ok).map(([id]) => id);
        return { answered, accuracy, recentAccuracy, byDifficulty, targetDifficulty, weakConcepts, weakTopicIds, missedQuestionIds };
    }
}
