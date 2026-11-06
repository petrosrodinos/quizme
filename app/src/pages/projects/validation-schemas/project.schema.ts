import { z } from "zod";
import { tr } from "@/lib/i18n-options";

export const projectFormSchema = z.object({
    title: z.string().trim().min(1, { error: () => tr("projects:form.errors.titleRequired") }).max(160, { error: () => tr("projects:form.errors.titleMax") }),
    description: z.string().max(4000).optional(),
    subject: z.string().max(80).optional(),
    language: z.string().min(1),
    exam_date: z.string().optional(),
    target_score: z.coerce.number().int().min(1, { error: () => tr("projects:form.errors.targetRange") }).max(100, { error: () => tr("projects:form.errors.targetRange") }),
    difficulty: z.string().min(1),
    status: z.string().min(1),
    tags: z.array(z.string().max(40)).max(20),
    daily_minutes_goal: z.coerce.number().int().min(5, { error: () => tr("projects:form.errors.dailyMin") }).max(480, { error: () => tr("projects:form.errors.dailyMax") }),
    weekly_days_target: z.coerce.number().int().min(1, { error: () => tr("projects:form.errors.weeklyRange") }).max(7, { error: () => tr("projects:form.errors.weeklyRange") }),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
