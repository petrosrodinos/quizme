import { SummaryLevels, type SummaryLevel } from "@/features/summaries/interfaces/summaries.interfaces";

export const SummaryLevelFormOptions: { id: SummaryLevel; label: string }[] = [
    { id: SummaryLevels.ONE_MINUTE, label: "1-minute summary" },
    { id: SummaryLevels.FIVE_MINUTE, label: "5-minute summary" },
    { id: SummaryLevels.DETAILED, label: "Detailed summary" },
    { id: SummaryLevels.CHEAT_SHEET, label: "Exam cheat sheet" },
    { id: SummaryLevels.STUDY_GUIDE, label: "Study guide" },
];

export const SummaryLevelDescriptionOptions: { id: SummaryLevel; description: string }[] = [
    { id: SummaryLevels.ONE_MINUTE, description: "A very short overview of the essentials." },
    { id: SummaryLevels.FIVE_MINUTE, description: "Key concepts and how they relate." },
    { id: SummaryLevels.DETAILED, description: "A full walkthrough of every important idea." },
    { id: SummaryLevels.CHEAT_SHEET, description: "Only the must-know facts, formulas and definitions." },
    { id: SummaryLevels.STUDY_GUIDE, description: "Objectives, explanations, pitfalls and self-test questions." },
];

export const getSummaryLevelLabel = (level: SummaryLevel | string): string => SummaryLevelFormOptions.find((o) => o.id === level)?.label ?? level;
export const getSummaryLevelDescription = (level: SummaryLevel | string): string =>
    SummaryLevelDescriptionOptions.find((o) => o.id === level)?.description ?? "";
