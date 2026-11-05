import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import RatingScaleAxis from '@/features/events/components/RatingScaleAxis';
import type { ParticipantRating } from '@/features/events/components/RatingNotes';

const row = (pseudo: string, value: number | null, isSelf = false): ParticipantRating => ({
  participantId: pseudo,
  pseudo,
  avatarId: null,
  value,
  isSelf,
});

function renderAxis(rows: ParticipantRating[], scale: 'five' | 'ten' = 'five') {
  return render(
    <LocaleProvider>
      <RatingScaleAxis participants={rows} scale={scale} />
    </LocaleProvider>
  );
}

describe('RatingScaleAxis', () => {
  it('draws nothing while nobody has rated', () => {
    const { container } = renderAxis([row('Léa', null)]);
    expect(container).toBeEmptyDOMElement();
  });

  it('reads every rating and the average to assistive technology, you included', () => {
    renderAxis([row('Adrien', 8, true), row('Théo', 6), row('Inès', null)]);

    expect(
      screen.getByRole('img', {
        name: 'Échelle des notes de 0 à 5 : Vous 4/5, Théo 3/5. Moyenne 3,5/5.',
      })
    ).toBeInTheDocument();
  });

  it('picks out your own avatar among the others', () => {
    const { container } = renderAxis([row('Adrien', 8, true), row('Théo', 8), row('Inès', 6)]);

    expect(container.querySelectorAll('[data-self]')).toHaveLength(1);
  });

  it('places each person on the scale of the user', () => {
    const { container } = renderAxis([row('Léa', 10), row('Théo', 5)], 'ten');

    const positions = [...container.querySelectorAll<HTMLElement>('[data-axis-mark]')].map((mark) =>
      mark.style.getPropertyValue('--at')
    );

    expect(positions).toEqual(['50%', '100%']);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('de 0 à 10');
  });

  it('gathers the people who gave the same rating on one mark, and counts the rest', () => {
    const { container } = renderAxis([
      row('Ana', 8),
      row('Bob', 8),
      row('Cleo', 8),
      row('Dan', 8),
      row('Eve', 8),
    ]);

    expect(container.querySelectorAll('[data-axis-mark]')).toHaveLength(1);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
