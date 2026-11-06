import { z } from "zod";
import { tr } from "@/lib/i18n-options";
import { QuestionTypes } from "@/features/questions/interfaces/questions.interfaces";

const typeValues = Object.values(QuestionTypes) as [string, ...string[]];

/** Single editor schema; per-type requirements enforced via superRefine. */
export const questionFormSchema = z
    .object({
        type: z.enum(typeValues),
        prompt: z.string().trim().min(5, { error: () => tr("questions:validation.prompt") }).max(2000, { error: () => tr("common:validation.maxLength", { count: 2000 }) }),
        explanation: z.string().max(4000, { error: () => tr("common:validation.maxLength", { count: 4000 }) }).optional(),
        difficulty: z.string(),
        concept: z.string().max(120, { error: () => tr("common:validation.maxLength", { count: 120 }) }).optional(),
        topic_id: z.string().optional(),
        tags: z.string().optional(),
        options: z.array(z.object({ text: z.string(), correct: z.boolean() })),
        tf_correct: z.enum(["true", "false"]),
        answers: z.string().optional(),
        pairs: z.array(z.object({ left: z.string(), right: z.string() })),
        items: z.array(z.object({ text: z.string() })),
        expected_answer: z.string().optional(),
        key_concepts: z.string().optional(),
    })
    .superRefine((v, ctx) => {
        const add = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
        if (v.type === "MCQ" || v.type === "MULTI_SELECT") {
            const filled = v.options.filter((o) => o.text.trim());
            if (filled.length < 2) add("options", tr("questions:validation.options"));
            const correct = filled.filter((o) => o.correct).length;
            if (v.type === "MCQ" && correct !== 1) add("options", tr("questions:validation.oneCorrect"));
            if (v.type === "MULTI_SELECT" && correct < 1) add("options", tr("questions:validation.markCorrect"));
        }
        if (v.type === "FILL_BLANK") {
            if (!/_{3,}/.test(v.prompt)) add("prompt", tr("questions:validation.blank"));
            if (!v.answers?.split(",").some((a) => a.trim())) add("answers", tr("questions:validation.answers"));
        }
        if (v.type === "MATCHING" && v.pairs.filter((p) => p.left.trim() && p.right.trim()).length < 2) add("pairs", tr("questions:validation.pairs"));
        if (v.type === "ORDERING" && v.items.filter((i) => i.text.trim()).length < 2) add("items", tr("questions:validation.items"));
        if (v.type === "FREE_TEXT" && !v.expected_answer?.trim()) add("expected_answer", tr("questions:validation.expected"));
    });

export type QuestionFormValues = z.infer<typeof questionFormSchema>;
