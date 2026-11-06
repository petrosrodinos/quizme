import { RecallModes, type RecallMode, type RecallVerdict } from "@/features/recall/interfaces/recall.interfaces";
import { tOption, tr } from "@/lib/i18n-options";

const mode = (id: RecallMode) => ({
    id,
    get label(): string {
        return tr(`recall:modes.${id}.label`);
    },
    get description(): string {
        return tr(`recall:modes.${id}.description`);
    },
});

export const RecallModeFormOptions: { id: RecallMode; label: string; description: string }[] = [mode(RecallModes.ACTIVE_RECALL), mode(RecallModes.TEACH_BACK)];

export const getRecallModeLabel = (m: RecallMode | string): string => RecallModeFormOptions.find((o) => o.id === m)?.label ?? m;

export const RecallVerdictOptions: { id: RecallVerdict; label: string }[] = [
    tOption("correct", "recall:verdict.correct"),
    tOption("partially_correct", "recall:verdict.partially_correct"),
    tOption("incorrect", "recall:verdict.incorrect"),
];

export const getRecallVerdictLabel = (v: RecallVerdict | string): string => RecallVerdictOptions.find((o) => o.id === v)?.label ?? v;
