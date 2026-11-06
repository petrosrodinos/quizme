import { tr } from "@/lib/i18n-options";
import { DailyGoalTypes, type DailyGoalType } from "@/features/gamification/interfaces/gamification.interfaces";

const goal = (id: DailyGoalType, minutes: number | null) => ({
    id,
    minutes,
    get label(): string {
        return tr(`gamification:dailyGoal.${id}.label`);
    },
    get description(): string {
        return tr(`gamification:dailyGoal.${id}.description`);
    },
});

export const DailyGoalFormOptions: { id: DailyGoalType; label: string; minutes: number | null; description: string }[] = [
    goal(DailyGoalTypes.CASUAL, 10),
    goal(DailyGoalTypes.REGULAR, 20),
    goal(DailyGoalTypes.SERIOUS, 40),
    goal(DailyGoalTypes.INTENSE, 60),
    goal(DailyGoalTypes.CUSTOM, null),
];

export const getDailyGoalLabel = (type: string) => DailyGoalFormOptions.find((o) => o.id === type)?.label ?? type;
