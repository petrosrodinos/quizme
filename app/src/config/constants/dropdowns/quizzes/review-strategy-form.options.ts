import { ReviewStrategies, type ReviewStrategy } from "@/features/quizzes/interfaces/quizzes.interfaces";

export const ReviewStrategyFormOptions: { id: ReviewStrategy; label: string; description: string }[] = [
    { id: ReviewStrategies.NEW_QUESTIONS, label: "New questions, same concepts", description: "Fresh questions that test the ideas you missed from a different angle." },
    { id: ReviewStrategies.RETRY, label: "Retry the exact questions", description: "Answer the questions you got wrong again." },
];

export const getReviewStrategyLabel = (s: ReviewStrategy | string): string => ReviewStrategyFormOptions.find((o) => o.id === s)?.label ?? s;
