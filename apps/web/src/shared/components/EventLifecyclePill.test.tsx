import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventLifecyclePill from '@/shared/components/EventLifecyclePill';
import styles from '@/shared/components/EventLifecyclePill.module.css';
import { LocaleProvider } from '@/shared/i18n';

function renderPill(element: React.ReactElement) {
  return render(<LocaleProvider>{element}</LocaleProvider>);
}

describe('EventLifecyclePill', () => {
  it('translates every state of the lifecycle', () => {
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

  it('only the movie night in progress carries the pulse, decorative', () => {
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

  it('accepts an explicit label and detail', () => {
    renderPill(<EventLifecyclePill lifecycle="upcoming" label="Bientôt" detail="dans 2 jours" />);

    expect(screen.queryByText('À venir')).toBeNull();
    expect(screen.getByText('Bientôt')).toHaveTextContent('dans 2 jours');
  });
});
