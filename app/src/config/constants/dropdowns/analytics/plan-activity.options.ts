import { PlanActivityTypes, type PlanActivityType } from "@/features/analytics/interfaces/analytics.interfaces";

export const PlanActivityOptions: { id: PlanActivityType; label: string }[] = [
    { id: PlanActivityTypes.FLASHCARDS, label: "Flashcards" },
    { id: PlanActivityTypes.ADAPTIVE_QUIZ, label: "Adaptive quiz" },
    { id: PlanActivityTypes.RECALL, label: "Explain concepts" },
    { id: PlanActivityTypes.EXAM, label: "Exam simulation" },
    { id: PlanActivityTypes.WEAK_TOPICS, label: "Weak topics" },
];

export const getPlanActivityLabel = (type: string) => PlanActivityOptions.find((o) => o.id === type)?.label ?? type;
