import { z } from "zod";
import { tr } from "@/lib/i18n-options";

export const topicFormSchema = z.object({
    name: z.string().trim().min(1, { error: () => tr("topics:validation.nameRequired") }).max(80, { error: () => tr("common:validation.maxLength", { count: 80 }) }),
    description: z.string().max(500, { error: () => tr("common:validation.maxLength", { count: 500 }) }).optional(),
});

export type TopicFormValues = z.infer<typeof topicFormSchema>;
