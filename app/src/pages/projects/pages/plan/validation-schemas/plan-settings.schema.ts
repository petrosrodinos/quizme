import { z } from "zod";
import { tr } from "@/lib/i18n-options";

export const planSettingsSchema = z.object({
    exam_date: z.string().optional(),
    target_score: z.coerce.number().int().min(1, { error: () => tr("plan:form.errors.targetRange") }).max(100, { error: () => tr("plan:form.errors.targetRange") }),
    daily_minutes_goal: z.coerce.number().int().min(5, { error: () => tr("plan:form.errors.minutesMin") }).max(480, { error: () => tr("plan:form.errors.minutesMax") }),
    weekly_days_target: z.coerce.number().int().min(1, { error: () => tr("plan:form.errors.daysRange") }).max(7, { error: () => tr("plan:form.errors.daysRange") }),
});
export type PlanSettingsFormValues = z.infer<typeof planSettingsSchema>;
