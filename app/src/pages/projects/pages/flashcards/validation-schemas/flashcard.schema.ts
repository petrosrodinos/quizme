import { z } from "zod";

export const flashcardFormSchema = z.object({
    front: z.string().trim().min(1, "Front is required").max(2000),
    back: z.string().trim().min(1, "Back is required").max(4000),
    deck_id: z.string().optional(),
    topic_id: z.string().optional(),
    tags: z.array(z.string().max(40)).max(20),
    category: z.string().max(80).optional(),
    difficulty: z.coerce.number().int().min(1).max(5),
});
export type FlashcardFormValues = z.infer<typeof flashcardFormSchema>;

export const generateFlashcardsSchema = z.object({
    count: z.coerce.number().int().min(1, "At least 1").max(60, "At most 60"),
    deck_id: z.string().optional(),
    document_ids: z.array(z.string()),
    topic_ids: z.array(z.string()),
    instructions: z.string().max(500).optional(),
});
export type GenerateFlashcardsFormValues = z.infer<typeof generateFlashcardsSchema>;

export const deckFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(120),
    description: z.string().max(1000).optional(),
});
export type DeckFormValues = z.infer<typeof deckFormSchema>;
