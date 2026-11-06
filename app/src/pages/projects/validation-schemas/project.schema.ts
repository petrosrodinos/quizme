import { z } from "zod";

export const projectFormSchema = z.object({
    title: z.string().trim().min(1, "Title is required").max(160, "Keep it under 160 characters"),
    description: z.string().max(4000).optional(),
    subject: z.string().max(80).optional(),
    exam_date: z.string().optional(),
    target_score: z.coerce.number().int().min(1, "1–100").max(100, "1–100"),
    difficulty: z.string().min(1),
    status: z.string().min(1),
    tags: z.array(z.string().max(40)).max(20),
    daily_minutes_goal: z.coerce.number().int().min(5, "At least 5 minutes").max(480, "At most 8 hours"),
    weekly_days_target: z.coerce.number().int().min(1, "1–7").max(7, "1–7"),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
