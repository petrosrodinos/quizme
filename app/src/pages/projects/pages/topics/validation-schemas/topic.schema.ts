import { z } from "zod";

export const topicFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(80),
    description: z.string().max(500).optional(),
});

export type TopicFormValues = z.infer<typeof topicFormSchema>;
