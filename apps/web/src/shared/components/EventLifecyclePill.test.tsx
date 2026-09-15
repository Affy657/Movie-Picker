import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventLifecyclePill from '@/shared/components/EventLifecyclePill';
import styles from '@/shared/components/EventLifecyclePill.module.css';
import { LocaleProvider } from '@/shared/i18n';

function renderPill(element: React.ReactElement) {
  return render(<LocaleProvider>{element}</LocaleProvider>);
}

describe('EventLifecyclePill', () => {
  it('traduit chaque état du cycle de vie', () => {
    renderPill(
      <>
        <EventLifecyclePill lifecycle="upcoming" />
        <EventLifecyclePill lifecycle="live" />
        <EventLifecyclePill lifecycle="pending" />
        <EventLifecyclePill lifecycle="finished" />
      </>
    );

    expect(screen.getByText('À venir')).toHaveClass(styles.upcoming!);
    expect(screen.getByText('En cours')).toHaveClass(styles.live!);
    expect(screen.getByText('En suspens')).toHaveClass(styles.pending!);
    expect(screen.getByText('Terminée')).toHaveClass(styles.finished!);
  });

  it('seule la soirée en cours porte la pulsation, décorative', () => {
    const { container } = renderPill(
      <>
        <EventLifecyclePill lifecycle="live" />
        <EventLifecyclePill lifecycle="upcoming" />
      </>
    );

    const pulses = container.querySelectorAll(`.${styles.pulse}`);
    expect(pulses).toHaveLength(1);
    expect(pulses[0]).toHaveAttribute('aria-hidden', 'true');
  });

  it('accepte un libellé et un détail explicites', () => {
    renderPill(<EventLifecyclePill lifecycle="upcoming" label="Bientôt" detail="dans 2 jours" />);

    expect(screen.queryByText('À venir')).toBeNull();
    expect(screen.getByText('Bientôt')).toHaveTextContent('dans 2 jours');
  });
});
