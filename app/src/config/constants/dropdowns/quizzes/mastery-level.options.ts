export const MasteryLevels = {
    MASTERED: "MASTERED",
    STRONG: "STRONG",
    DEVELOPING: "DEVELOPING",
    WEAK: "WEAK",
    UNPRACTISED: "UNPRACTISED",
} as const;
export type MasteryLevel = (typeof MasteryLevels)[keyof typeof MasteryLevels];

export const MasteryLevelOptions: { id: MasteryLevel; label: string }[] = [
    { id: MasteryLevels.MASTERED, label: "Mastered (≥ 85%)" },
    { id: MasteryLevels.STRONG, label: "Strong (70–84%)" },
    { id: MasteryLevels.DEVELOPING, label: "Developing (50–69%)" },
    { id: MasteryLevels.WEAK, label: "Weak (< 50%)" },
    { id: MasteryLevels.UNPRACTISED, label: "Not practised" },
];

export const getMasteryLevel = (mastery: number, attempts: number): MasteryLevel => {
    if (!attempts) return MasteryLevels.UNPRACTISED;
    if (mastery >= 85) return MasteryLevels.MASTERED;
    if (mastery >= 70) return MasteryLevels.STRONG;
    if (mastery >= 50) return MasteryLevels.DEVELOPING;
    return MasteryLevels.WEAK;
};
