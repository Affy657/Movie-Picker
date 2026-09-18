import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import {
  EventSummaryCardBody,
  eventDateChipTone,
  formatCountdownCompact,
  isEventSoon,
} from '@/features/events/components/EventSummaryCard';
import type { MyEventSummary } from '@/features/events/types';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

vi.mock('@/shared/hooks/useIsMobile', () => ({ useIsMobile: vi.fn(() => false) }));

function event(overrides: Partial<MyEventSummary> = {}): MyEventSummary {
  return {
    id: 'e1',
    slug: 'soiree',
    title: 'Ciné-club du mercredi',
    date: '2026-06-19',
    time: '20:30',
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z',
    isCreator: true,
    isParticipant: true,
    lifecycle: 'upcoming',
    participantCount: 3,
    maxParticipants: 8,
    movieCount: 5,
    theme: 'Halloween',
    ...overrides,
  };
}

function renderCard(ev: MyEventSummary) {
  return render(
    <LocaleProvider>
      <EventSummaryCardBody event={ev} />
    </LocaleProvider>
  );
}

describe('EventSummaryCardBody', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    vi.mocked(useIsMobile).mockReturnValue(false);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('puts the day and the time in the date tile, and the title takes the full width', () => {
    const { container } = renderCard(event());

    const tile = container.querySelector('[aria-hidden="true"]');
    expect(tile).toHaveTextContent('juin');
    expect(tile).toHaveTextContent('19');
    expect(tile).toHaveTextContent('20h30');
    expect(screen.getByText('Ciné-club du mercredi')).toBeInTheDocument();
    expect(screen.getByText('Halloween')).toBeInTheDocument();
  });

  it('names the host discreetly in the footer, with its explanation on hover', () => {
    renderCard(event());

    const host = screen.getByText('Hôte');
    expect(host.closest('[title]')).toHaveAttribute('title', 'Vous organisez cette soirée');
  });

  it('shows no role for a night the user only attends', () => {
    renderCard(event({ isCreator: false }));

    expect(screen.queryByText('Hôte')).not.toBeInTheDocument();
  });

  it('counts down in the footer and reads the participants and the films for a screen reader', () => {
    renderCard(event());

    expect(screen.getByText('dans 4 jours')).toBeInTheDocument();
    expect(screen.getByText('3 / 8 participants')).toBeInTheDocument();
    expect(screen.getByText('5 films proposés')).toBeInTheDocument();
  });

  it('replaces the countdown by the live pill for a night in progress', () => {
    renderCard(event({ lifecycle: 'live', date: '2026-06-15' }));

    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.queryByText('aujourd’hui')).not.toBeInTheDocument();
  });

  it('on mobile, shortens the countdown and keeps the host as an icon only', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    renderCard(event());

    expect(screen.getByText('4 j')).toBeInTheDocument();
    expect(screen.queryByText('dans 4 jours')).not.toBeInTheDocument();
    expect(screen.getByText('Hôte')).toHaveClass('visually-hidden');
    expect(screen.getByText('Hôte').closest('[title]')).toHaveAttribute(
      'title',
      'Vous organisez cette soirée'
    );
  });

  it('lists the winners already drawn', () => {
    renderCard(event({ winnerMovies: [{ title: 'Matrix', posterPath: null }] }));

    expect(screen.getByLabelText('Gagnants : Matrix')).toBeInTheDocument();
    expect(screen.getByText('Matrix')).toBeInTheDocument();
  });
});

describe('formatCountdownCompact', () => {
  const t = (key: string, vars?: Record<string, string | number>) =>
    vars ? `${key}(${Object.values(vars).join('|')})` : key;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('names today, tomorrow and yesterday, then counts days, months and years', () => {
    const compact = (iso: string) => formatCountdownCompact(iso, t as never);
    expect(compact('2026-06-15')).toBe('events.myEvents.countdown.today');
    expect(compact('2026-06-16')).toBe('events.myEvents.countdown.tomorrow');
    expect(compact('2026-06-14')).toBe('events.myEvents.countdown.yesterday');
    expect(compact('2026-06-19')).toBe('events.myEvents.countdown.inDays(4)');
    expect(compact('2026-06-10')).toBe('events.myEvents.countdown.daysAgo(5)');
    expect(compact('2027-02-20')).toBe('events.myEvents.countdown.inMonths(8)');
    expect(compact('2025-11-20')).toBe('events.myEvents.countdown.monthsAgo(7)');
    expect(compact('2027-07-20')).toBe('events.myEvents.countdown.inYearOne');
    expect(compact('2035-03-01')).toBe('events.myEvents.countdown.inYearMany(9)');
    expect(compact('2025-05-01')).toBe('events.myEvents.countdown.yearsAgoOne');
    expect(compact('2020-01-01')).toBe('events.myEvents.countdown.yearsAgoMany(6)');
    expect(compact('nope')).toBe('nope');
  });
});

describe('isEventSoon and eventDateChipTone', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is soon from today up to seven days ahead, for an upcoming night only', () => {
    expect(isEventSoon('2026-06-15', 'upcoming')).toBe(true);
    expect(isEventSoon('2026-06-22', 'upcoming')).toBe(true);
    expect(isEventSoon('2026-06-23', 'upcoming')).toBe(false);
    expect(isEventSoon('2026-06-14', 'upcoming')).toBe(false);
    expect(isEventSoon('2026-06-16', 'pending')).toBe(false);
    expect(isEventSoon('not-a-date', 'upcoming')).toBe(false);
  });

  it('picks the tile tone from the lifecycle first, then from the countdown', () => {
    expect(eventDateChipTone('2026-06-16', 'live')).toBe('live');
    expect(eventDateChipTone('2026-06-10', 'pending')).toBe('pending');
    expect(eventDateChipTone('2026-06-16', 'upcoming')).toBe('soon');
    expect(eventDateChipTone('2026-09-16', 'upcoming')).toBe('default');
    expect(eventDateChipTone('2026-06-16', 'finished')).toBe('default');
  });
});
