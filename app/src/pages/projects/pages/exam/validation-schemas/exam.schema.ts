import { z } from "zod";

export const examFormSchema = z.object({
    title: z.string().max(160).optional(),
    count: z.number().int().min(5, "At least 5 questions").max(60, "At most 60 questions"),
    time_limit_min: z.number().int().min(1, "At least 1 minute").max(600),
    target_score: z.number().int().min(1).max(100),
    difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
    types: z.array(z.string()).min(1, "Pick at least one question type"),
    topic_ids: z.array(z.string()),
    randomize: z.boolean(),
    use_bank: z.boolean(),
});

export type ExamFormValues = z.infer<typeof examFormSchema>;
