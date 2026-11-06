import { PlanActivityTypes, type PlanActivityType } from "@/features/analytics/interfaces/analytics.interfaces";
import { tOption } from "@/lib/i18n-options";

export const PlanActivityOptions: { id: PlanActivityType; label: string }[] = [
    tOption(PlanActivityTypes.FLASHCARDS, "plan:activities.flashcards"),
    tOption(PlanActivityTypes.ADAPTIVE_QUIZ, "plan:activities.adaptive_quiz"),
    tOption(PlanActivityTypes.RECALL, "plan:activities.recall"),
    tOption(PlanActivityTypes.EXAM, "plan:activities.exam"),
    tOption(PlanActivityTypes.WEAK_TOPICS, "plan:activities.weak_topics"),
];

export const getPlanActivityLabel = (type: string) => PlanActivityOptions.find((o) => o.id === type)?.label ?? type;
