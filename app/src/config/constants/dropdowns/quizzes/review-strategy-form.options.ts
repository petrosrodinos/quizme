import { ReviewStrategies, type ReviewStrategy } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { tOption } from "@/lib/i18n-options";

export const ReviewStrategyFormOptions = [
    tOption(ReviewStrategies.NEW_QUESTIONS, "quiz:reviewStrategy.new_questions.label", "quiz:reviewStrategy.new_questions.description"),
    tOption(ReviewStrategies.RETRY, "quiz:reviewStrategy.retry.label", "quiz:reviewStrategy.retry.description"),
] as { id: ReviewStrategy; label: string; description: string }[];

export const getReviewStrategyLabel = (s: ReviewStrategy | string): string => ReviewStrategyFormOptions.find((o) => o.id === s)?.label ?? s;
