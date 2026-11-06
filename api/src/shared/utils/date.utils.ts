import { DateTime } from 'luxon';

/** Returns YYYY-MM-DD for the given instant in the user's timezone. */
export const localDateKey = (timezone: string, at: Date = new Date()): string => {
    const dt = DateTime.fromJSDate(at).setZone(safeZone(timezone));
    return dt.toISODate() as string;
};

export const safeZone = (timezone?: string | null): string => {
    if (!timezone) return 'UTC';
    return DateTime.local().setZone(timezone).isValid ? timezone : 'UTC';
};

export const startOfLocalDay = (timezone: string, at: Date = new Date()): Date =>
    DateTime.fromJSDate(at).setZone(safeZone(timezone)).startOf('day').toJSDate();

export const addDaysKey = (key: string, days: number): string =>
    DateTime.fromISO(key).plus({ days }).toISODate() as string;

export const daysBetween = (from: Date, to: Date): number =>
    Math.ceil((to.getTime() - from.getTime()) / 86_400_000);

export const startOfIsoWeek = (timezone: string, at: Date = new Date()): Date =>
    DateTime.fromJSDate(at).setZone(safeZone(timezone)).startOf('week').toJSDate();
