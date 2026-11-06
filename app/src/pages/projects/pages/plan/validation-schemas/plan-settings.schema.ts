import { z } from "zod";

export const planSettingsSchema = z.object({
    exam_date: z.string().optional(),
    target_score: z.coerce.number().int().min(1, "1–100").max(100, "1–100"),
    daily_minutes_goal: z.coerce.number().int().min(5, "At least 5 minutes").max(480, "At most 480 minutes"),
    weekly_days_target: z.coerce.number().int().min(1, "1–7 days").max(7, "1–7 days"),
});
export type PlanSettingsFormValues = z.infer<typeof planSettingsSchema>;
