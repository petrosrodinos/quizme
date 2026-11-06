import { CardStatus, ReviewRating } from 'generated/prisma';

export interface SrsState {
    status: CardStatus;
    ease: number;
    interval_days: number;
    repetitions: number;
    lapses: number;
    learning_step: number;
}

const MIN = 60_000;
const DAY = 86_400_000;
const LEARNING_STEPS_MIN = [1, 10];
const RELEARNING_STEPS_MIN = [10];
const GRADUATING_INTERVAL = 1;
const EASY_INTERVAL = 4;
const KNOWN_THRESHOLD_DAYS = 21;
const MIN_EASE = 1.3;
const MAX_INTERVAL = 365;

const fuzz = (days: number) => (days < 3 ? days : days * (0.95 + Math.random() * 0.1));

/**
 * SM-2 spaced-repetition scheduler with Anki-style learning/relearning steps.
 * Status mapping: NEW (never reviewed) → LEARNING (in steps or young interval) → KNOWN (interval ≥ 21d);
 * a lapse on a graduated card → NEEDS_REVIEW (relearning) until answered correctly again.
 */
export const schedule = (state: SrsState, rating: ReviewRating, now = new Date()): SrsState & { due_at: Date } => {
    const s = { ...state };
    const inSteps = s.status === CardStatus.NEW || ((s.status === CardStatus.LEARNING || s.status === CardStatus.NEEDS_REVIEW) && s.repetitions === 0);
    const steps = s.status === CardStatus.NEEDS_REVIEW ? RELEARNING_STEPS_MIN : LEARNING_STEPS_MIN;

    if (inSteps) {
        if (rating === ReviewRating.EASY) {
            s.interval_days = s.status === CardStatus.NEEDS_REVIEW ? Math.max(1, s.interval_days || 1) * 1.5 : EASY_INTERVAL;
            s.repetitions = 1;
            s.status = CardStatus.LEARNING;
            s.learning_step = 0;
            return { ...s, due_at: new Date(now.getTime() + fuzz(s.interval_days) * DAY) };
        }
        if (rating === ReviewRating.AGAIN) {
            s.learning_step = 0;
            s.status = s.status === CardStatus.NEW ? CardStatus.LEARNING : s.status;
            return { ...s, due_at: new Date(now.getTime() + steps[0] * MIN) };
        }
        if (rating === ReviewRating.HARD) {
            s.status = s.status === CardStatus.NEW ? CardStatus.LEARNING : s.status;
            const step = steps[Math.min(s.learning_step, steps.length - 1)];
            return { ...s, due_at: new Date(now.getTime() + step * 1.5 * MIN) };
        }
        // GOOD
        const next = s.learning_step + 1;
        if (next < steps.length) {
            s.learning_step = next;
            s.status = s.status === CardStatus.NEW ? CardStatus.LEARNING : s.status;
            return { ...s, due_at: new Date(now.getTime() + steps[next] * MIN) };
        }
        s.interval_days = s.status === CardStatus.NEEDS_REVIEW ? Math.max(1, s.interval_days) : GRADUATING_INTERVAL;
        s.repetitions = Math.max(1, s.repetitions);
        s.learning_step = 0;
        s.status = CardStatus.LEARNING;
        return { ...s, due_at: new Date(now.getTime() + fuzz(s.interval_days) * DAY) };
    }

    // Graduated (review) card.
    switch (rating) {
        case ReviewRating.AGAIN:
            s.lapses += 1;
            s.ease = Math.max(MIN_EASE, s.ease - 0.2);
            s.interval_days = Math.max(1, Math.round(s.interval_days * 0.5));
            s.status = CardStatus.NEEDS_REVIEW;
            s.learning_step = 0;
            s.repetitions = 0;
            return { ...s, due_at: new Date(now.getTime() + RELEARNING_STEPS_MIN[0] * MIN) };
        case ReviewRating.HARD:
            s.ease = Math.max(MIN_EASE, s.ease - 0.15);
            s.interval_days = Math.min(MAX_INTERVAL, Math.max(s.interval_days + 1, s.interval_days * 1.2));
            break;
        case ReviewRating.GOOD:
            s.interval_days = Math.min(MAX_INTERVAL, Math.max(s.interval_days + 1, s.interval_days * s.ease));
            break;
        case ReviewRating.EASY:
            s.ease = s.ease + 0.15;
            s.interval_days = Math.min(MAX_INTERVAL, Math.max(s.interval_days + 2, s.interval_days * s.ease * 1.3));
            break;
    }
    s.repetitions += 1;
    s.status = s.interval_days >= KNOWN_THRESHOLD_DAYS ? CardStatus.KNOWN : CardStatus.LEARNING;
    const interval = fuzz(s.interval_days);
    return { ...s, interval_days: Number(interval.toFixed(2)), due_at: new Date(now.getTime() + interval * DAY) };
};

/** Human-readable preview of the next interval for each rating (shown on the rating buttons). */
export const previewIntervals = (state: SrsState) => {
    const now = new Date();
    const out: Record<string, string> = {};
    for (const r of [ReviewRating.AGAIN, ReviewRating.HARD, ReviewRating.GOOD, ReviewRating.EASY]) {
        const ms = schedule(state, r, now).due_at.getTime() - now.getTime();
        out[r] = ms < 3_600_000 ? `${Math.max(1, Math.round(ms / MIN))}m` : ms < DAY ? `${Math.round(ms / 3_600_000)}h` : `${Math.round(ms / DAY)}d`;
    }
    return out;
};
