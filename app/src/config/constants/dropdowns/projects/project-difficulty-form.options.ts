export const ProjectDifficultyFormOptions: { id: string; label: string }[] = [
    { id: "BEGINNER", label: "Beginner" },
    { id: "INTERMEDIATE", label: "Intermediate" },
    { id: "ADVANCED", label: "Advanced" },
    { id: "EXPERT", label: "Expert" },
];

export const getProjectDifficultyLabel = (difficulty: string): string => ProjectDifficultyFormOptions.find((o) => o.id === difficulty)?.label ?? difficulty;
