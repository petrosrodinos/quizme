import { SummaryLevels, type SummaryLevel } from "@/features/summaries/interfaces/summaries.interfaces";
import { tOption, tr } from "@/lib/i18n-options";

const LEVELS: SummaryLevel[] = [SummaryLevels.ONE_MINUTE, SummaryLevels.FIVE_MINUTE, SummaryLevels.DETAILED, SummaryLevels.CHEAT_SHEET, SummaryLevels.STUDY_GUIDE];

export const SummaryLevelFormOptions: { id: SummaryLevel; label: string }[] = LEVELS.map((id) => tOption(id, `summaries:levels.${id}.label`));

export const SummaryLevelDescriptionOptions: { id: SummaryLevel; description: string }[] = LEVELS.map((id) => ({
    id,
    get description(): string {
        return tr(`summaries:levels.${id}.description`);
    },
}));

export const getSummaryLevelLabel = (level: SummaryLevel | string): string => SummaryLevelFormOptions.find((o) => o.id === level)?.label ?? level;
export const getSummaryLevelDescription = (level: SummaryLevel | string): string =>
    SummaryLevelDescriptionOptions.find((o) => o.id === level)?.description ?? "";
