import { z } from "zod";
import { tr } from "@/lib/i18n-options";

export const examFormSchema = z.object({
    title: z.string().max(160).optional(),
    count: z.number().int().min(5, { error: () => tr("exam:validation.countMin", { count: 5 }) }).max(60, { error: () => tr("exam:validation.countMax", { count: 60 }) }),
    time_limit_min: z.number().int().min(1, { error: () => tr("exam:validation.timeMin") }).max(600, { error: () => tr("exam:validation.timeMax", { count: 600 }) }),
    target_score: z.number().int().min(1, { error: () => tr("exam:validation.target") }).max(100, { error: () => tr("exam:validation.target") }),
    difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
    types: z.array(z.string()).min(1, { error: () => tr("exam:validation.types") }),
    topic_ids: z.array(z.string()),
    randomize: z.boolean(),
    use_bank: z.boolean(),
});

export type ExamFormValues = z.infer<typeof examFormSchema>;
