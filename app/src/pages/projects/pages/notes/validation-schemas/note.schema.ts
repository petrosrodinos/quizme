import { z } from "zod";
import { tr } from "@/lib/i18n-options";

export const noteFormSchema = z.object({
    type: z.enum(["NOTE", "HIGHLIGHT", "ANNOTATION", "BOOKMARK", "QUESTION"]),
    title: z.string().max(200, { error: () => tr("common:validation.maxLength", { count: 200 }) }).optional(),
    content: z.string().max(50_000, { error: () => tr("common:validation.maxLength", { count: 50000 }) }),
    tags: z.array(z.string().max(40)).max(20),
    color: z.string().optional(),
    topic_id: z.string().optional(),
    is_shared: z.boolean(),
});

export type NoteFormValues = z.infer<typeof noteFormSchema>;
