import { DailyGoalTypes, type DailyGoalType } from "@/features/gamification/interfaces/gamification.interfaces";

export const DailyGoalFormOptions: { id: DailyGoalType; label: string; minutes: number | null; description: string }[] = [
    { id: DailyGoalTypes.CASUAL, label: "Casual", minutes: 10, description: "10 minutes a day — keep things ticking over" },
    { id: DailyGoalTypes.REGULAR, label: "Regular", minutes: 20, description: "20 minutes a day — steady, sustainable progress" },
    { id: DailyGoalTypes.SERIOUS, label: "Serious", minutes: 40, description: "40 minutes a day — exam season" },
    { id: DailyGoalTypes.INTENSE, label: "Intense", minutes: 60, description: "60 minutes a day — final push" },
    { id: DailyGoalTypes.CUSTOM, label: "Custom", minutes: null, description: "Set your own minutes target" },
];

export const getDailyGoalLabel = (type: string) => DailyGoalFormOptions.find((o) => o.id === type)?.label ?? type;
