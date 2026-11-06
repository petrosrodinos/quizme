import { tOption } from "@/lib/i18n-options";

export const HighlightColorOptions: { id: string; label: string }[] = [
    tOption("amber", "notes:colors.amber"),
    tOption("teal", "notes:colors.teal"),
    tOption("coral", "notes:colors.coral"),
    tOption("violet", "notes:colors.violet"),
];

export const getHighlightColorLabel = (color: string): string => HighlightColorOptions.find((o) => o.id === color)?.label ?? color;
