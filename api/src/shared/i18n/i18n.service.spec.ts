import { normalizeLang, translate } from './translate';
import { MESSAGES } from './messages';

describe('server i18n', () => {
    it('interpolates parameters and handles plurals', () => {
        expect(translate('en', 'notif.goal.body', { count: 1 })).toBe('Your streak is now 1 day.');
        expect(translate('el', 'notif.goal.body', { count: 5 })).toBe('Το σερί σας είναι πλέον 5 ημέρες.');
        expect(translate('el', 'notif.quizCompleted.title', { percent: 80 })).toBe('Το κουίζ ολοκληρώθηκε: 80%');
    });

    it('translates nested "@:" references in the target language', () => {
        expect(translate('el', 'notif.invitation.body', { role: '@:role.EDITOR' })).toBe('Ρόλος: επεξεργαστής');
        expect(translate('en', 'notif.invitation.body', { role: '@:role.EDITOR' })).toBe('Role: editor');
    });

    it('falls back to English and then to the key', () => {
        expect(translate('el', 'does.not.exist')).toBe('does.not.exist');
    });

    it('normalises language codes', () => {
        expect(normalizeLang('el-GR')).toBe('el');
        expect(normalizeLang('EN')).toBe('en');
        expect(normalizeLang(null)).toBe('en');
    });

    it('has identical keys in every language', () => {
        const en = Object.keys(MESSAGES.en).sort();
        const el = Object.keys(MESSAGES.el).sort();
        expect(el).toEqual(en);
    });
});
