import { describe, expect, it } from 'vitest';
import { fr } from '@/shared/i18n/locales/fr';
import { translate, type TranslationKey } from '@/shared/i18n/t';
import { formatEventTitleDate } from '@/shared/utils/formatMyEventsListDate';
import { invitationShareText } from '@/features/events/utils/invitationShareText';

const t = (key: TranslationKey, vars?: Record<string, string | number>) => translate(fr, key, vars);

const date = `${new Date().getFullYear()}-09-18`;

describe('invitationShareText', () => {
  it('invites to a movie night without repeating the date of a suggested title', () => {
    const title = `Soirée du ${formatEventTitleDate(date, 'fr')}`;

    expect(invitationShareText(t, 'fr', { title, date }, 'ven. 18 sept.', '20h')).toBe(
      'Je vous invite à une soirée ciné le ven. 18 sept. à 20h sur Movie Picker !'
    );
  });

  it('names a night its host titled', () => {
    expect(
      invitationShareText(t, 'fr', { title: 'Nuit Nolan', date }, 'ven. 18 sept.', '20h30')
    ).toBe('Je vous invite à « Nuit Nolan » le ven. 18 sept. à 20h30 sur Movie Picker !');
  });
});
