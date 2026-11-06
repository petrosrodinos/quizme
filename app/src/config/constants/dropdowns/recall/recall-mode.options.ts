import { RecallModes, type RecallMode, type RecallVerdict } from "@/features/recall/interfaces/recall.interfaces";

export const RecallModeFormOptions: { id: RecallMode; label: string; description: string }[] = [
    { id: RecallModes.ACTIVE_RECALL, label: "Active recall", description: "Explain a concept from memory, then get graded feedback." },
    { id: RecallModes.TEACH_BACK, label: "Teach it back", description: "Explain it in your own words as if teaching someone else." },
];

export const getRecallModeLabel = (mode: RecallMode | string): string => RecallModeFormOptions.find((o) => o.id === mode)?.label ?? mode;

export const RecallVerdictOptions: { id: RecallVerdict; label: string }[] = [
    { id: "correct", label: "Correct" },
    { id: "partially_correct", label: "Partially correct" },
    { id: "incorrect", label: "Needs work" },
];

export const getRecallVerdictLabel = (v: RecallVerdict | string): string => RecallVerdictOptions.find((o) => o.id === v)?.label ?? v;
