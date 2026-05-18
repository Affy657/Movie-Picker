import { render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/features/theme/ThemeContext';
import { LocaleProvider } from '@/features/i18n/LocaleContext';
import { EventCard } from './EventCard';
import type { MyEventSummary } from '@/api/events';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>{children}</LocaleProvider>
    </ThemeProvider>
  );
}

const baseEvent: MyEventSummary = {
  id: 'evt1',
  slug: 'soiree-test',
  title: 'Soirée test',
  date: '2026-06-15',
  time: '20:00',
  isCreator: true,
  isParticipant: true,
  lifecycle: 'upcoming',
  participantCount: 4,
  movieCount: 7,
  theme: '🍕',
};

describe('EventCard', () => {
  it('renders title and emoji theme', async () => {
    const { findByText, getByText } = render(
      <Wrap>
        <EventCard event={baseEvent} />
      </Wrap>
    );
    await findByText('Soirée test');
    expect(getByText('🍕')).toBeTruthy();
  });

  it('shows host badge (icon-only circle) when creator', async () => {
    const { findByLabelText, queryByLabelText, rerender } = render(
      <Wrap>
        <EventCard event={baseEvent} />
      </Wrap>
    );
    await findByLabelText('Hôte');

    rerender(
      <Wrap>
        <EventCard event={{ ...baseEvent, isCreator: false }} />
      </Wrap>
    );
    await waitFor(() => expect(queryByLabelText('Hôte')).toBeNull());
  });

  it('hides the lifecycle pill for upcoming events (aligned web)', async () => {
    const { findByText, queryByText } = render(
      <Wrap>
        <EventCard event={baseEvent} />
      </Wrap>
    );
    await findByText('Soirée test');
    expect(queryByText('À venir')).toBeNull();
  });

  it('shows the lifecycle pill for live events', async () => {
    const { findByText } = render(
      <Wrap>
        <EventCard event={{ ...baseEvent, lifecycle: 'live' }} />
      </Wrap>
    );
    await findByText('● En cours');
  });

  it('shows Terminée for finished when showLifecycleBadge is true', async () => {
    const { findByText } = render(
      <Wrap>
        <EventCard event={{ ...baseEvent, lifecycle: 'finished' }} showLifecycleBadge />
      </Wrap>
    );
    await findByText('Terminée');
  });

  it('hides the lifecycle pill when showLifecycleBadge=false (history tab)', async () => {
    const { findByText, queryByText } = render(
      <Wrap>
        <EventCard event={{ ...baseEvent, lifecycle: 'finished' }} showLifecycleBadge={false} />
      </Wrap>
    );
    await findByText('Soirée test');
    expect(queryByText('Terminée')).toBeNull();
  });
});
