import { tr } from "@/lib/i18n-options";

const level = (id: string, from_level: number) => ({
    id,
    from_level,
    get label(): string {
        return tr(`gamification:levels.${id}`);
    },
});

/** Level title ladder (mirrors the server-side levelTitle()). */
export const LevelTitleOptions: { id: string; label: string; from_level: number }[] = [
    level("novice", 1),
    level("apprentice", 5),
    level("scholar", 10),
    level("expert", 20),
    level("master", 35),
    level("sage", 50),
];

/** Translates a server-provided English level title ("Novice" … "Sage"); falls back to the original text. */
export const getLevelTitleLabel = (title: string | null | undefined): string =>
    title ? tr(`gamification:levels.${title.toLowerCase()}`, { defaultValue: title }) : "";
