import type { ReactElement } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import EventDetailHeader, {
  type EventDetailHeaderProps,
} from '@/features/events/pages/event-detail/EventDetailHeader';
import { LocaleProvider } from '@/shared/i18n';
import { ConsentProvider } from '@/shared/contexts/ConsentContext';

function renderHeader(ui: ReactElement) {
  return render(
    <LocaleProvider>
      <ConsentProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ConsentProvider>
    </LocaleProvider>
  );
}

const baseProps: EventDetailHeaderProps = {
  title: 'Soirée ciné',
  dateFormatted: 'lundi 15 juin à 19h00',
  rawDate: '2026-06-15',
  rawTime: '19:00',
  isFinished: false,
  eventTheme: null,
  shareUrl: 'https://moviepicker.app/e/abc',
  lifecycle: 'upcoming',
  participantCount: 3,
  moviesCount: 2,
  votersCount: 2,
  participantsOpen: false,
  onToggleParticipants: () => {},
};

describe('EventDetailHeader', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
  });

  it('shows the movie night summary and the start countdown', () => {
    renderHeader(<EventDetailHeader {...baseProps} countdownLabel="22 h" />);
    expect(screen.getByRole('heading', { name: 'Soirée ciné' })).toBeInTheDocument();
    expect(screen.getByText('Commence dans')).toBeInTheDocument();
    expect(screen.getByText('22 h')).toBeInTheDocument();
    expect(screen.getByText('lundi 15 juin à 19h00')).toBeInTheDocument();
    expect(screen.getByText('2 films')).toBeInTheDocument();
    expect(screen.getByText('2 votants sur 3')).toBeInTheDocument();
  });

  it('hides the badge as long as the movie night is not within 24 h', () => {
    renderHeader(<EventDetailHeader {...baseProps} />);
    expect(screen.queryByText('Commence dans')).not.toBeInTheDocument();
    expect(screen.queryByText('À venir')).not.toBeInTheDocument();
  });

  it('shows no countdown when the movie night is in progress', () => {
    renderHeader(<EventDetailHeader {...baseProps} lifecycle="live" countdownLabel="22 h" />);
    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.queryByText('22 h')).not.toBeInTheDocument();
  });

  it('shows the Share button and the calendar separately', async () => {
    const user = userEvent.setup();
    const onOpenShare = vi.fn();
    renderHeader(<EventDetailHeader {...baseProps} onOpenShare={onOpenShare} />);

    const shareButton = screen.getByRole('button', { name: /^partager$/i });
    expect(shareButton).toBeInTheDocument();
    await user.click(shareButton);
    expect(onOpenShare).toHaveBeenCalledTimes(1);

    expect(screen.queryByRole('menuitem', { name: /google calendar/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ajouter au calendrier/i }));
    expect(screen.getByRole('menuitem', { name: /google calendar/i })).toBeInTheDocument();
  });

  it('keeps the Share button visible but hides the calendar for a finished movie night', () => {
    renderHeader(
      <EventDetailHeader {...baseProps} isFinished lifecycle="finished" onOpenShare={() => {}} />
    );
    expect(screen.getByText('Terminée')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^partager$/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /ajouter au calendrier/i })
    ).not.toBeInTheDocument();
  });

  it('bascule la liste des participants depuis la pile d’avatars', async () => {
    const user = userEvent.setup();
    const onToggleParticipants = vi.fn();
    renderHeader(<EventDetailHeader {...baseProps} onToggleParticipants={onToggleParticipants} />);

    const toggle = screen.getByTestId('participants-toggle');
    expect(toggle).toHaveTextContent('3 participants');
    expect(screen.queryByTestId('participants-toggle-condensed')).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(onToggleParticipants).toHaveBeenCalledTimes(1);
  });

  it('shows the theme under the movie night title', () => {
    renderHeader(<EventDetailHeader {...baseProps} eventTheme="Comédie noire" />);
    const heading = screen.getByRole('heading', { name: 'Soirée ciné' });
    const theme = screen.getByRole('status', { name: /Thème de soirée : Comédie noire/i });
    expect(heading.compareDocumentPosition(theme) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('exposes the settings cog only when a handler is provided', () => {
    const { unmount } = renderHeader(<EventDetailHeader {...baseProps} />);
    expect(
      screen.queryByRole('button', { name: /paramètres de la soirée/i })
    ).not.toBeInTheDocument();
    unmount();

    renderHeader(<EventDetailHeader {...baseProps} onOpenSettings={() => {}} />);
    expect(screen.getByRole('button', { name: /paramètres de la soirée/i })).toBeInTheDocument();
  });
});
