import { z } from "zod";
import { tr } from "@/lib/i18n-options";

export const flashcardFormSchema = z.object({
    front: z.string().trim().min(1, { error: () => tr("flashcards:validation.frontRequired") }).max(2000, { error: () => tr("common:validation.maxLength", { count: 2000 }) }),
    back: z.string().trim().min(1, { error: () => tr("flashcards:validation.backRequired") }).max(4000, { error: () => tr("common:validation.maxLength", { count: 4000 }) }),
    deck_id: z.string().optional(),
    topic_id: z.string().optional(),
    tags: z.array(z.string().max(40)).max(20),
    category: z.string().max(80).optional(),
    difficulty: z.coerce.number().int().min(1).max(5),
});
export type FlashcardFormValues = z.infer<typeof flashcardFormSchema>;

export const generateFlashcardsSchema = z.object({
    count: z.coerce.number().int().min(1, { error: () => tr("common:validation.min", { min: 1 }) }).max(60, { error: () => tr("common:validation.max", { max: 60 }) }),
    deck_id: z.string().optional(),
    document_ids: z.array(z.string()),
    topic_ids: z.array(z.string()),
    instructions: z.string().max(500).optional(),
});
export type GenerateFlashcardsFormValues = z.infer<typeof generateFlashcardsSchema>;

export const deckFormSchema = z.object({
    name: z.string().trim().min(1, { error: () => tr("flashcards:validation.deckNameRequired") }).max(120, { error: () => tr("common:validation.maxLength", { count: 120 }) }),
    description: z.string().max(1000).optional(),
});
export type DeckFormValues = z.infer<typeof deckFormSchema>;
