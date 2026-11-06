import { gradeObjective, normalizeGenerated, toClientPayload } from './questions.utils';
import { GeneratedQuestion } from '../ai/ai.schemas';
import { Passage } from '../ai/ai.types';

const passage: Passage = {
    chunkId: 'c1',
    documentId: 'd1',
    documentTitle: 'Biology',
    pageStart: 4,
    pageEnd: 4,
    section: 'Mitochondria',
    topicId: null,
    content: 'Mitochondria are membrane-bound organelles that produce most of the cell ATP through cellular respiration. The folds of the inner membrane are called cristae.',
};

const base: GeneratedQuestion = {
    type: 'MCQ',
    prompt: 'Which organelle produces most of the cell ATP?',
    options: ['Mitochondria', 'Ribosome', 'Golgi apparatus', 'Lysosome'],
    correct_indices: [0],
    correct_boolean: null,
    accepted_answers: [],
    pairs: [],
    ordered_items: [],
    expected_answer: null,
    key_concepts: [],
    explanation: 'Mitochondria produce ATP.',
    difficulty: 2,
    concept: 'Mitochondria function',
    topic: null,
    source_index: 1,
    supporting_quote: 'Mitochondria are membrane-bound organelles that produce most of the cell ATP',
};

describe('normalizeGenerated (AI output validation)', () => {
    it('accepts a valid grounded MCQ', () => {
        const n = normalizeGenerated(base, [passage]);
        expect(n?.type).toBe('MCQ');
        expect(n?.data).toEqual({ options: base.options, correct: [0] });
    });

    it('rejects MCQs with multiple correct answers, duplicate options or "all of the above"', () => {
        expect(normalizeGenerated({ ...base, correct_indices: [0, 1] }, [passage])).toBeNull();
        expect(normalizeGenerated({ ...base, options: ['A', 'a', 'B', 'C'] }, [passage])).toBeNull();
        expect(normalizeGenerated({ ...base, options: ['A', 'B', 'C', 'All of the above'] }, [passage])).toBeNull();
    });

    it('rejects questions whose quote is not supported by the cited passage (hallucination guard)', () => {
        expect(normalizeGenerated({ ...base, supporting_quote: 'Photosynthesis happens in the thylakoid membranes of chloroplasts' }, [passage])).toBeNull();
    });

    it('requires a blank placeholder for fill-in-the-blank', () => {
        const fb = { ...base, type: 'FILL_BLANK' as const, options: [], correct_indices: [], accepted_answers: ['cristae'] };
        expect(normalizeGenerated({ ...fb, prompt: 'The folds of the inner membrane are called what?' }, [passage])).toBeNull();
        expect(normalizeGenerated({ ...fb, prompt: 'The folds of the inner membrane are called _____.' }, [passage])?.data).toEqual({ answers: ['cristae'] });
    });
});

describe('gradeObjective', () => {
    it('grades MCQ and multi-select with partial credit', () => {
        expect(gradeObjective('MCQ', { options: ['a', 'b', 'c', 'd'], correct: [2] }, { selected: [2] })).toMatchObject({ isCorrect: true, score: 1 });
        expect(gradeObjective('MCQ', { options: ['a', 'b', 'c', 'd'], correct: [2] }, { selected: [1] })).toMatchObject({ isCorrect: false, score: 0 });
        const multi = gradeObjective('MULTI_SELECT', { options: ['a', 'b', 'c', 'd'], correct: [0, 2] }, { selected: [0] });
        expect(multi).toMatchObject({ isCorrect: false, score: 0.5 });
    });

    it('accepts close spellings for fill-in-the-blank', () => {
        expect(gradeObjective('FILL_BLANK', { answers: ['mitochondria'] }, { text: 'Mitochondria' })?.isCorrect).toBe(true);
        expect(gradeObjective('FILL_BLANK', { answers: ['mitochondria'] }, { text: 'mitochondira' })?.isCorrect).toBe(true);
        expect(gradeObjective('FILL_BLANK', { answers: ['mitochondria'] }, { text: 'ribosome' })?.isCorrect).toBe(false);
    });

    it('scores matching and ordering by fraction correct', () => {
        const pairs = [
            { left: 'ATP', right: 'energy currency' },
            { left: 'Osmosis', right: 'water diffusion' },
        ];
        expect(gradeObjective('MATCHING', { pairs }, { pairs })?.score).toBe(1);
        expect(gradeObjective('MATCHING', { pairs }, { pairs: [{ left: 'ATP', right: 'energy currency' }, { left: 'Osmosis', right: 'nope' }] })?.score).toBe(0.5);
        expect(gradeObjective('ORDERING', { items: ['a', 'b', 'c'] }, { order: ['a', 'c', 'b'] })?.score).toBeCloseTo(0.333, 2);
    });
});

describe('toClientPayload', () => {
    it('never leaks answers and shuffles matching/ordering deterministically', () => {
        const mcq = toClientPayload({ id: 'q1', type: 'MCQ', data: { options: ['a', 'b', 'c', 'd'], correct: [1] } });
        expect(mcq).not.toHaveProperty('correct');
        const items = ['first', 'second', 'third', 'fourth'];
        const ord1 = toClientPayload({ id: 'q2', type: 'ORDERING', data: { items } }) as { items: string[] };
        const ord2 = toClientPayload({ id: 'q2', type: 'ORDERING', data: { items } }) as { items: string[] };
        expect(ord1.items).toEqual(ord2.items);
        expect(ord1.items).not.toEqual(items);
        expect([...ord1.items].sort()).toEqual([...items].sort());
    });
});

describe('fill-in-the-blank context', () => {
    it('accepts the answer without words already shown around the blank', () => {
        const prompt = 'The theory explaining the origin of mitochondria is called the _____ theory.';
        expect(gradeObjective('FILL_BLANK', { answers: ['endosymbiotic theory'] }, { text: 'endosymbiotc' }, prompt)?.isCorrect).toBe(true);
        expect(gradeObjective('FILL_BLANK', { answers: ['endosymbiotic theory'] }, { text: 'endosymbiotic theory' }, prompt)?.isCorrect).toBe(true);
    });
});
