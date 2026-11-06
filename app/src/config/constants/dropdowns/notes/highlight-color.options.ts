export const HighlightColorOptions: { id: string; label: string }[] = [
    { id: "amber", label: "Amber" },
    { id: "teal", label: "Teal" },
    { id: "coral", label: "Coral" },
    { id: "violet", label: "Violet" },
];

export const getHighlightColorLabel = (color: string): string => HighlightColorOptions.find((o) => o.id === color)?.label ?? color;
