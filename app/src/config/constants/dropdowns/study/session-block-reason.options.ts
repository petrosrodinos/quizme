import { tr } from "@/lib/i18n-options";
import type { SessionBlock } from "@/features/study/interfaces/study.interfaces";

/**
 * Localises the server-generated reason of a daily-session block. The API composes English sentences
 * (api/src/modules/study/study.service.ts → dailySession); known patterns are re-expressed via i18n keys
 * with their dynamic parts extracted, anything unknown falls back to the server text.
 */
const PATTERNS: { re: RegExp; key: string; params?: (m: RegExpExecArray) => Record<string, unknown> }[] = [
    { re: /^Everything starts with your own sources\.$/, key: "study:reasons.upload" },
    { re: /^You have (\d+) cards? due for review today\.$/, key: "study:reasons.cardsDue", params: (m) => ({ count: Number(m[1]) }) },
    { re: /^Learn some new cards\.$/, key: "study:reasons.newCards" },
    { re: /^Fresh questions on concepts you keep missing: (.+)\.$/, key: "study:reasons.missedConcepts", params: (m) => ({ concepts: m[1] }) },
    { re: /^Target your weakest topics\.$/, key: "study:reasons.weakTopics" },
    { re: /^Questions tuned to your level \(difficulty ~([\d.]+)\/5\)\.$/, key: "study:reasons.adaptive", params: (m) => ({ level: m[1] }) },
    { re: /^Active recall builds durable memory\.$/, key: "study:reasons.recall" },
    { re: /^Exam in (\d+) days? — practise under exam conditions\.$/, key: "study:reasons.exam", params: (m) => ({ count: Number(m[1]) }) },
];

export const getSessionBlockReason = (block: Pick<SessionBlock, "reason">): string => {
    const reason = block.reason?.trim() ?? "";
    for (const p of PATTERNS) {
        const m = p.re.exec(reason);
        if (m) return tr(p.key, p.params?.(m));
    }
    return reason;
};
