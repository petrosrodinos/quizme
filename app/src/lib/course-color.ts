/** Stable, bright colour pair (fill + ridge) for a course badge, derived from its id. */
const COURSE_COLORS: [string, string][] = [
    ["#58cc02", "#46a302"],
    ["#1cb0f6", "#1899d6"],
    ["#ce82ff", "#a568cc"],
    ["#ff9600", "#cd7900"],
    ["#ff4b4b", "#ea2b2b"],
    ["#2b70c9", "#1f5aa3"],
    ["#00cd9c", "#00a37c"],
    ["#ff86d0", "#e06bb3"],
];

export const courseColor = (id: string | null | undefined): { fill: string; ridge: string } => {
    let h = 0;
    for (const c of id ?? "") h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const [fill, ridge] = COURSE_COLORS[h % COURSE_COLORS.length];
    return { fill, ridge };
};
