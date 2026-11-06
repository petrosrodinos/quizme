import { z } from 'zod';

/** Structured-output schemas. Every field is required (nullable when optional) so they work with strict JSON-schema modes. */

export const GeneratedQuestionSchema = z.object({
    type: z.enum(['MCQ', 'MULTI_SELECT', 'TRUE_FALSE', 'FREE_TEXT', 'FILL_BLANK', 'MATCHING', 'ORDERING']),
    prompt: z.string().describe('The question text. For FILL_BLANK include exactly one "_____" placeholder.'),
    options: z.array(z.string()).describe('MCQ/MULTI_SELECT answer options (4-6). Empty for other types.'),
    correct_indices: z.array(z.number().int()).describe('Zero-based indices of correct options (MCQ: exactly one).'),
    correct_boolean: z.boolean().nullable().describe('TRUE_FALSE answer, else null.'),
    accepted_answers: z.array(z.string()).describe('FILL_BLANK accepted answers (first is canonical). Empty otherwise.'),
    pairs: z.array(z.object({ left: z.string(), right: z.string() })).describe('MATCHING pairs (3-6). Empty otherwise.'),
    ordered_items: z.array(z.string()).describe('ORDERING items in the correct order (3-7). Empty otherwise.'),
    expected_answer: z.string().nullable().describe('FREE_TEXT model answer, else null.'),
    key_concepts: z.array(z.string()).describe('Concepts a complete answer must mention (FREE_TEXT), else empty.'),
    explanation: z.string().describe('Why the answer is correct, grounded in the source.'),
    difficulty: z.number().int().min(1).max(5),
    concept: z.string().describe('Short name of the underlying concept being tested.'),
    topic: z.string().nullable(),
    source_index: z.number().int().describe('Number of the source passage [n] that supports the question.'),
    supporting_quote: z.string().describe('Short verbatim quote from that passage supporting the answer.'),
});
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

export const QuestionBatchSchema = z.object({ questions: z.array(GeneratedQuestionSchema) });

export const FlashcardBatchSchema = z.object({
    cards: z.array(
        z.object({
            front: z.string(),
            back: z.string(),
            tags: z.array(z.string()),
            category: z.string().nullable(),
            difficulty: z.number().int().min(1).max(5),
            source_index: z.number().int(),
        }),
    ),
});
export type GeneratedFlashcard = z.infer<typeof FlashcardBatchSchema>['cards'][number];

export const TopicTreeSchema = z.object({
    topics: z.array(
        z.object({
            name: z.string(),
            description: z.string(),
            keywords: z.array(z.string()),
            section_indices: z.array(z.number().int()).describe('Indices of the sections that belong to this topic.'),
            subtopics: z.array(
                z.object({
                    name: z.string(),
                    description: z.string(),
                    keywords: z.array(z.string()),
                    section_indices: z.array(z.number().int()),
                }),
            ),
        }),
    ),
});
export type TopicTree = z.infer<typeof TopicTreeSchema>;

export const TutorAnswerSchema = z.object({
    answer: z.string().describe('Markdown answer. Cite sources inline as [1], [2].'),
    cited_sources: z.array(z.number().int()),
    grounded: z.boolean().describe('False when the sources do not support an answer.'),
});

export const EvaluationSchema = z.object({
    score: z.number().int().min(0).max(100),
    verdict: z.enum(['correct', 'partially_correct', 'incorrect']),
    expected_answer: z.string(),
    explanation: z.string(),
    mentioned_concepts: z.array(z.string()),
    missing_concepts: z.array(z.string()),
    incorrect_statements: z.array(z.string()),
    suggestions: z.array(z.string()),
    clarity: z.number().int().min(0).max(100).nullable(),
    completeness: z.number().int().min(0).max(100),
    accuracy: z.number().int().min(0).max(100),
});
export type Evaluation = z.infer<typeof EvaluationSchema>;

export const WordLookupSchema = z.object({
    word: z.string(),
    definition: z.string(),
    contextual_meaning: z.string(),
    pronunciation: z.string().nullable(),
    part_of_speech: z.string().nullable(),
    translation: z.string().nullable(),
    example: z.string(),
    related_terms: z.array(z.string()),
});
export type WordLookup = z.infer<typeof WordLookupSchema>;

export const RecallPromptSchema = z.object({
    prompts: z.array(
        z.object({
            prompt: z.string(),
            reference_answer: z.string(),
            key_concepts: z.array(z.string()),
            source_index: z.number().int(),
        }),
    ),
});
