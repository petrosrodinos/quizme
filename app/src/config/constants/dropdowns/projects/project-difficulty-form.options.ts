import { tOption } from "@/lib/i18n-options";

export const ProjectDifficultyFormOptions: { id: string; label: string }[] = [
    tOption("BEGINNER", "projects:difficulty.BEGINNER"),
    tOption("INTERMEDIATE", "projects:difficulty.INTERMEDIATE"),
    tOption("ADVANCED", "projects:difficulty.ADVANCED"),
    tOption("EXPERT", "projects:difficulty.EXPERT"),
];

export const getProjectDifficultyLabel = (difficulty: string): string => ProjectDifficultyFormOptions.find((o) => o.id === difficulty)?.label ?? difficulty;
