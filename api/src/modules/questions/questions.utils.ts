import { QuestionType } from 'generated/prisma';
import { contentTokens, similarity } from '@/integrations/ai/local/nlp.utils';
import { sha256 } from '@/shared/utils/hash.utils';
import { GeneratedQuestion } from '../ai/ai.schemas';
import { Passage } from '../ai/ai.types';

export type QuestionData =
    | { options: string[]; correct: number[] } // MCQ / MULTI_SELECT
    | { correct: boolean } // TRUE_FALSE
    | { answers: string[] } // FILL_BLANK
    | { pairs: { left: string; right: string }[] } // MATCHING
    | { items: string[] } // ORDERING
    | { expected_answer: string; key_concepts: string[] }; // FREE_TEXT

export interface NormalizedQuestion {
    type: QuestionType;
    prompt: string;
    data: QuestionData;
    explanation: string;
    difficulty: number;
    concept: string;
    passageIndex: number;
    quote: string;
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const uniq = (arr: string[]) => new Set(arr.map((a) => a.toLowerCase().trim())).size === arr.length;

/** Removes words from an accepted answer that the prompt already shows around the blank ("____ theory" + "X theory" → "X"). */
export const stripBlankContext = (prompt: string, answer: string): string => {
    const m = /(\S+\s+)?_{3,}(\s+\S+)?/.exec(prompt);
    if (!m) return answer;
    let a = answer.trim();
    const after = m[2]?.trim().replace(/[^\p{L}\p{N}-]/gu, '').toLowerCase();
    const before = m[1]?.trim().replace(/[^\p{L}\p{N}-]/gu, '').toLowerCase();
    const words = a.split(/\s+/);
    if (after && words.length > 1 && words[words.length - 1].toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '') === after) words.pop();
    if (before && words.length > 1 && words[0].toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '') === before) words.shift();
    a = words.join(' ');
    return a || answer;
};

export const questionHash = (type: string, prompt: string) =>
    sha256(`${type}:${prompt.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`);

/** Grounding check: the supporting quote must substantially overlap with the cited passage. */
const isGrounded = (quote: string, passage?: Passage): boolean => {
    if (!passage) return false;
    const q = contentTokens(quote);
    if (q.length < 3) return true;
    const p = new Set(contentTokens(passage.content));
    return q.filter((t) => p.has(t)).length / q.length >= 0.5;
};

/**
 * Validates and normalizes an AI-generated question. Returns null for invalid, ambiguous or ungrounded items
 * (e.g. MCQ with duplicate options or multiple unintended correct answers, matching with duplicate sides).
 */
export const normalizeGenerated = (g: GeneratedQuestion, passages: Passage[]): NormalizedQuestion | null => {
    const prompt = clean(g.prompt ?? '');
    if (prompt.length < 8) return null;
    const passageIndex = Math.max(0, Math.min(passages.length - 1, (g.source_index ?? 1) - 1));
    if (!isGrounded(g.supporting_quote ?? '', passages[passageIndex])) return null;
    const base = {
        prompt,
        explanation: clean(g.explanation ?? ''),
        difficulty: Math.min(5, Math.max(1, Math.round(g.difficulty || 2))),
        concept: clean(g.concept ?? '').slice(0, 120) || 'General',
        passageIndex,
        quote: clean(g.supporting_quote ?? '').slice(0, 400),
    };
    switch (g.type) {
        case 'MCQ':
        case 'MULTI_SELECT': {
            const options = (g.options ?? []).map(clean).filter(Boolean);
            const correct = [...new Set(g.correct_indices ?? [])].filter((i) => i >= 0 && i < options.length);
            if (options.length < 4 || options.length > 6 || !uniq(options)) return null;
            if (options.some((o) => /^(all|none) of the above/i.test(o))) return null;
            if (g.type === 'MCQ' && correct.length !== 1) return null;
            if (g.type === 'MULTI_SELECT' && (correct.length < 2 || correct.length === options.length)) return null;
            return { ...base, type: g.type, data: { options, correct } };
        }
        case 'TRUE_FALSE':
            if (typeof g.correct_boolean !== 'boolean') return null;
            return { ...base, type: 'TRUE_FALSE', data: { correct: g.correct_boolean } };
        case 'FILL_BLANK': {
            const answers = [...new Set((g.accepted_answers ?? []).map(clean).filter(Boolean).map((a) => stripBlankContext(prompt, a)))];
            if (!answers.length || !/_{3,}/.test(prompt)) return null;
            return { ...base, prompt: prompt.replace(/_{3,}/, '_____'), type: 'FILL_BLANK', data: { answers } };
        }
        case 'MATCHING': {
            const pairs = (g.pairs ?? []).map((p) => ({ left: clean(p.left), right: clean(p.right) })).filter((p) => p.left && p.right);
            if (pairs.length < 3 || pairs.length > 6 || !uniq(pairs.map((p) => p.left)) || !uniq(pairs.map((p) => p.right))) return null;
            return { ...base, type: 'MATCHING', data: { pairs } };
        }
        case 'ORDERING': {
            const items = (g.ordered_items ?? []).map(clean).filter(Boolean);
            if (items.length < 3 || items.length > 8 || !uniq(items)) return null;
            return { ...base, type: 'ORDERING', data: { items } };
        }
        case 'FREE_TEXT': {
            const expected = clean(g.expected_answer ?? '');
            if (expected.length < 10) return null;
            return { ...base, type: 'FREE_TEXT', data: { expected_answer: expected, key_concepts: (g.key_concepts ?? []).map(clean).filter(Boolean).slice(0, 6) } };
        }
        default:
            return null;
    }
};

/** Deterministic shuffle so the same question renders identically across reloads, but never in the stored order. */
const seededShuffle = <T>(arr: T[], seed: string): T[] => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        const j = Math.abs(h) % (i + 1);
        [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.length > 1 && out.every((v, i) => v === arr[i])) out.push(out.shift()!);
    return out;
};

/** Strips answers before sending a question to a quiz taker. */
export const toClientPayload = (q: { id: string; type: QuestionType; data: any }) => {
    switch (q.type) {
        case 'MCQ':
        case 'MULTI_SELECT':
            return { options: q.data.options, select_count: q.type === 'MULTI_SELECT' ? q.data.correct.length : 1 };
        case 'MATCHING':
            return { left: q.data.pairs.map((p: any) => p.left), right: seededShuffle(q.data.pairs.map((p: any) => p.right), q.id) };
        case 'ORDERING':
            return { items: seededShuffle(q.data.items, q.id) };
        case 'FILL_BLANK':
            return { blanks: 1 };
        default:
            return {};
    }
};

export interface ObjectiveGrade {
    isCorrect: boolean;
    score: number;
    correctAnswer: unknown;
}

/** Deterministic server-side grading for objective question types. */
export const gradeObjective = (type: QuestionType, data: any, answer: any, prompt = ''): ObjectiveGrade | null => {
    switch (type) {
        case 'MCQ':
        case 'MULTI_SELECT': {
            const selected = new Set<number>((answer?.selected ?? []).map(Number));
            const correct = new Set<number>(data.correct);
            if (type === 'MCQ') {
                const ok = selected.size === 1 && correct.has([...selected][0]);
                return { isCorrect: ok, score: ok ? 1 : 0, correctAnswer: { selected: data.correct } };
            }
            const hits = [...selected].filter((s) => correct.has(s)).length;
            const wrong = selected.size - hits;
            const score = Math.max(0, (hits - wrong) / correct.size);
            return { isCorrect: hits === correct.size && wrong === 0, score: Number(score.toFixed(3)), correctAnswer: { selected: data.correct } };
        }
        case 'TRUE_FALSE': {
            const ok = answer?.value === data.correct;
            return { isCorrect: ok, score: ok ? 1 : 0, correctAnswer: { value: data.correct } };
        }
        case 'FILL_BLANK': {
            const text = String(answer?.text ?? '');
            // Length-aware typo tolerance: exact-ish for short words, up to 2 edits for long terms.
            const accepts = (a: string) => {
                const sim = similarity(a, text);
                const len = Math.max(a.trim().length, text.trim().length);
                const edits = Math.round((1 - sim) * len);
                return sim >= 0.85 || (len >= 8 && edits <= 2) || (len >= 5 && edits <= 1);
            };
            const candidates: string[] = [...new Set<string>([...data.answers, ...data.answers.map((a: string) => stripBlankContext(prompt, a))])];
            const best = Math.max(0, ...candidates.map((a: string) => similarity(a, text)));
            const ok = candidates.some(accepts);
            return { isCorrect: ok, score: ok ? 1 : best >= 0.6 ? 0.5 : 0, correctAnswer: { text: data.answers[0], accepted: data.answers } };
        }
        case 'MATCHING': {
            const given = new Map<string, string>((answer?.pairs ?? []).map((p: any) => [String(p.left), String(p.right)]));
            const hits = data.pairs.filter((p: any) => given.get(p.left) === p.right).length;
            const score = hits / data.pairs.length;
            return { isCorrect: score === 1, score: Number(score.toFixed(3)), correctAnswer: { pairs: data.pairs } };
        }
        case 'ORDERING': {
            const order: string[] = (answer?.order ?? []).map(String);
            const hits = data.items.filter((item: string, i: number) => order[i] === item).length;
            const score = hits / data.items.length;
            return { isCorrect: score === 1, score: Number(score.toFixed(3)), correctAnswer: { order: data.items } };
        }
        default:
            return null;
    }
};

export const answerIsEmpty = (type: QuestionType, answer: any): boolean => {
    if (!answer) return true;
    switch (type) {
        case 'MCQ':
        case 'MULTI_SELECT':
            return !answer.selected?.length;
        case 'TRUE_FALSE':
            return typeof answer.value !== 'boolean';
        case 'MATCHING':
            return !answer.pairs?.length;
        case 'ORDERING':
            return !answer.order?.length;
        default:
            return !String(answer.text ?? '').trim();
    }
};
