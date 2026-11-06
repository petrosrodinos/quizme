/** Question difficulty scale 1-5. */
export const QuestionDifficultyFormOptions: { id: string; label: string }[] = [
    { id: "1", label: "1 · Recall" },
    { id: "2", label: "2 · Easy" },
    { id: "3", label: "3 · Medium" },
    { id: "4", label: "4 · Hard" },
    { id: "5", label: "5 · Expert" },
];

export const QuestionDifficultyFilterOptions: { id: string; label: string }[] = [{ id: "all", label: "Any difficulty" }, ...QuestionDifficultyFormOptions];

export const getQuestionDifficultyLabel = (difficulty: number | string): string =>
    QuestionDifficultyFormOptions.find((o) => o.id === String(Math.round(Number(difficulty))))?.label ?? String(difficulty);
