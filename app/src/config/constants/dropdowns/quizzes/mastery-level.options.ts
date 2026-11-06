import { tOption } from "@/lib/i18n-options";

export const MasteryLevels = {
    MASTERED: "MASTERED",
    STRONG: "STRONG",
    DEVELOPING: "DEVELOPING",
    WEAK: "WEAK",
    UNPRACTISED: "UNPRACTISED",
} as const;
export type MasteryLevel = (typeof MasteryLevels)[keyof typeof MasteryLevels];

export const MasteryLevelOptions = [
    tOption(MasteryLevels.MASTERED, "quiz:mastery.MASTERED"),
    tOption(MasteryLevels.STRONG, "quiz:mastery.STRONG"),
    tOption(MasteryLevels.DEVELOPING, "quiz:mastery.DEVELOPING"),
    tOption(MasteryLevels.WEAK, "quiz:mastery.WEAK"),
    tOption(MasteryLevels.UNPRACTISED, "quiz:mastery.UNPRACTISED"),
];

export const getMasteryLevel = (mastery: number, attempts: number): MasteryLevel => {
    if (!attempts) return MasteryLevels.UNPRACTISED;
    if (mastery >= 85) return MasteryLevels.MASTERED;
    if (mastery >= 70) return MasteryLevels.STRONG;
    if (mastery >= 50) return MasteryLevels.DEVELOPING;
    return MasteryLevels.WEAK;
};
