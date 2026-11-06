import { comboMultiplier, difficultyScale, levelFromXp, levelTitle, xpForLevel, XpRules } from './gamification.config';

describe('gamification rules', () => {
    it('uses xpForLevel(n) = 100 * n^1.5', () => {
        expect(xpForLevel(1)).toBe(100);
        expect(xpForLevel(4)).toBe(800);
    });

    it('maps total XP to levels with overflow into the next level', () => {
        expect(levelFromXp(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNext: 100 });
        expect(levelFromXp(99).level).toBe(1);
        expect(levelFromXp(100)).toEqual({ level: 2, xpIntoLevel: 0, xpForNext: 283 });
        expect(levelFromXp(450)).toEqual({ level: 3, xpIntoLevel: 67, xpForNext: 520 });
    });

    it('assigns level titles', () => {
        expect(levelTitle(1)).toBe('Novice');
        expect(levelTitle(5)).toBe('Apprentice');
        expect(levelTitle(10)).toBe('Scholar');
        expect(levelTitle(50)).toBe('Sage');
    });

    it('caps the combo multiplier at 1.5x', () => {
        expect(comboMultiplier(1)).toBe(1);
        expect(comboMultiplier(3)).toBe(1.1);
        expect(comboMultiplier(5)).toBe(1.25);
        expect(comboMultiplier(50)).toBe(XpRules.MAX_COMBO_MULTIPLIER);
    });

    it('scales correct-answer XP with difficulty', () => {
        expect(XpRules.CORRECT_ANSWER_BASE * difficultyScale(2)).toBe(10);
        expect(XpRules.CORRECT_ANSWER_BASE * difficultyScale(5)).toBeCloseTo(16);
    });
});
