import { z } from "zod";
import { QuestionTypes } from "@/features/questions/interfaces/questions.interfaces";

const typeValues = Object.values(QuestionTypes) as [string, ...string[]];

/** Single editor schema; per-type requirements enforced via superRefine. */
export const questionFormSchema = z
    .object({
        type: z.enum(typeValues),
        prompt: z.string().trim().min(5, "Write the question (at least 5 characters)").max(2000),
        explanation: z.string().max(4000).optional(),
        difficulty: z.string(),
        concept: z.string().max(120).optional(),
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
            if (filled.length < 2) add("options", "Provide at least 2 options");
            const correct = filled.filter((o) => o.correct).length;
            if (v.type === "MCQ" && correct !== 1) add("options", "Mark exactly one correct option");
            if (v.type === "MULTI_SELECT" && correct < 1) add("options", "Mark the correct options");
        }
        if (v.type === "FILL_BLANK") {
            if (!/_{3,}/.test(v.prompt)) add("prompt", 'Include "_____" where the blank goes');
            if (!v.answers?.split(",").some((a) => a.trim())) add("answers", "Provide at least one accepted answer");
        }
        if (v.type === "MATCHING" && v.pairs.filter((p) => p.left.trim() && p.right.trim()).length < 2) add("pairs", "Provide at least 2 complete pairs");
        if (v.type === "ORDERING" && v.items.filter((i) => i.text.trim()).length < 2) add("items", "Provide at least 2 items");
        if (v.type === "FREE_TEXT" && !v.expected_answer?.trim()) add("expected_answer", "Provide a model answer");
    });

export type QuestionFormValues = z.infer<typeof questionFormSchema>;
