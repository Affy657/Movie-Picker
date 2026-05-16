import { render } from '@testing-library/react-native';
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
  it('renders title and emoji theme', () => {
    const { getByText } = render(
      <Wrap>
        <EventCard event={baseEvent} />
      </Wrap>
    );
    expect(getByText('Soirée test')).toBeTruthy();
    expect(getByText('🍕')).toBeTruthy();
  });

  it('shows HÔTE badge when creator', () => {
    const { getByText } = render(
      <Wrap>
        <EventCard event={baseEvent} />
      </Wrap>
    );
    expect(getByText('HÔTE')).toBeTruthy();
  });

  it('renders the upcoming lifecycle badge', () => {
    const { getByText } = render(
      <Wrap>
        <EventCard event={baseEvent} />
      </Wrap>
    );
    expect(getByText('À venir')).toBeTruthy();
  });

  it('switches badge to Terminée for finished', () => {
    const { getByText } = render(
      <Wrap>
        <EventCard event={{ ...baseEvent, lifecycle: 'finished' }} />
      </Wrap>
    );
    expect(getByText('Terminée')).toBeTruthy();
  });
});
