import { schedule, SrsState } from './srs.utils';

const fresh: SrsState = { status: 'NEW', ease: 2.5, interval_days: 0, repetitions: 0, lapses: 0, learning_step: 0 };
const minutes = (d: Date, now: Date) => Math.round((d.getTime() - now.getTime()) / 60_000);
const days = (d: Date, now: Date) => (d.getTime() - now.getTime()) / 86_400_000;

describe('SRS scheduler (SM-2 with learning steps)', () => {
    const now = new Date('2026-01-01T10:00:00Z');

    it('moves a new card through learning steps before graduating', () => {
        const s1 = schedule(fresh, 'GOOD', now);
        expect(s1.status).toBe('LEARNING');
        expect(minutes(s1.due_at, now)).toBe(10);
        const s2 = schedule(s1, 'GOOD', now);
        expect(s2.status).toBe('LEARNING');
        expect(s2.repetitions).toBe(1);
        expect(days(s2.due_at, now)).toBeCloseTo(1, 1);
    });

    it('graduates immediately with EASY', () => {
        const s = schedule(fresh, 'EASY', now);
        expect(s.interval_days).toBe(4);
        expect(days(s.due_at, now)).toBeCloseTo(4, 0);
    });

    it('AGAIN resets learning to the first step', () => {
        const s = schedule({ ...fresh, status: 'LEARNING', learning_step: 1 }, 'AGAIN', now);
        expect(s.learning_step).toBe(0);
        expect(minutes(s.due_at, now)).toBe(1);
    });

    it('grows intervals by ease for GOOD reviews and marks long intervals as KNOWN', () => {
        let s: SrsState = { status: 'LEARNING', ease: 2.5, interval_days: 10, repetitions: 3, lapses: 0, learning_step: 0 };
        const next = schedule(s, 'GOOD', now);
        expect(next.interval_days).toBeGreaterThanOrEqual(23);
        expect(next.status).toBe('KNOWN');
        s = next;
        const easy = schedule(s, 'EASY', now);
        expect(easy.ease).toBeCloseTo(2.65, 2);
        expect(easy.interval_days).toBeGreaterThan(next.interval_days);
    });

    it('a lapse on a mature card sends it to relearning (NEEDS_REVIEW) and halves the interval', () => {
        const mature: SrsState = { status: 'KNOWN', ease: 2.5, interval_days: 30, repetitions: 5, lapses: 0, learning_step: 0 };
        const lapsed = schedule(mature, 'AGAIN', now);
        expect(lapsed.status).toBe('NEEDS_REVIEW');
        expect(lapsed.lapses).toBe(1);
        expect(lapsed.ease).toBeCloseTo(2.3, 5);
        expect(lapsed.interval_days).toBe(15);
        expect(minutes(lapsed.due_at, now)).toBe(10);
        const relearned = schedule(lapsed, 'GOOD', now);
        expect(relearned.status).toBe('LEARNING');
        expect(relearned.interval_days).toBe(15);
    });

    it('never lets ease drop below 1.3', () => {
        let s: SrsState = { status: 'LEARNING', ease: 1.35, interval_days: 5, repetitions: 4, lapses: 3, learning_step: 0 };
        s = schedule(s, 'AGAIN', now);
        expect(s.ease).toBeGreaterThanOrEqual(1.3);
    });
});
