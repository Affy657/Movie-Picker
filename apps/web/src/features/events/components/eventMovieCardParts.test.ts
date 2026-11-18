import { describe, expect, it, vi } from 'vitest';
import { t } from '@/shared/i18n';
import { nightRemoveAction } from './eventMovieCardParts';

const movie = { title: 'Dune' };

describe('nightRemoveAction', () => {
  it('offers nothing when the night rules forbid the removal', () => {
    expect(
      nightRemoveAction(movie, { isMine: true, canRemove: false }, vi.fn(), t)
    ).toBeUndefined();
  });

  it('lets the proposer take the movie back in plain words', () => {
    const onSelect = vi.fn();

    expect(nightRemoveAction(movie, { isMine: true, canRemove: true }, onSelect, t)).toEqual({
      label: 'Retirer',
      ariaLabel: 'Retirer Dune',
      opensDialog: true,
      onSelect,
    });
  });

  it('tells the host they remove someone else’s movie', () => {
    const action = nightRemoveAction(movie, { isMine: false, canRemove: true }, vi.fn(), t);

    expect(action).toMatchObject({
      label: 'Retirer',
      ariaLabel: 'Retirer « Dune » en tant qu’hôte',
      title: 'En tant qu’hôte, vous pouvez retirer n’importe quel film',
      opensDialog: true,
    });
  });
});
