import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import EventStartReminderBanner from '@/features/events/components/EventStartReminderBanner';

describe('EventStartReminderBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('n’affiche rien hors fenêtre ou soirée terminée', () => {
    vi.setSystemTime(new Date('2030-11-01T12:00:00Z'));
    const { rerender } = render(
      <EventStartReminderBanner date="2030-12-01" time="21:00" isFinished={false} />
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    rerender(<EventStartReminderBanner date="2030-12-01" time="21:00" isFinished />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('affiche la bannière dans les 30 minutes avant le début (UTC stocké)', () => {
    const start = Date.parse('2030-12-01T21:00:00Z');
    vi.setSystemTime(start - 15 * 60_000);

    render(<EventStartReminderBanner date="2030-12-01" time="21:00" isFinished={false} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Bientôt/i)).toBeInTheDocument();
    expect(screen.getByText(/15 minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/Début prévu/i)).toBeInTheDocument();
  });

  it('programme l’affichage avant l’entrée dans la fenêtre', () => {
    const start = Date.parse('2030-12-01T21:00:00Z');
    const windowStart = start - 30 * 60_000;
    vi.setSystemTime(windowStart - 60_000);

    render(<EventStartReminderBanner date="2030-12-01" time="21:00" isFinished={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(60_001);
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
