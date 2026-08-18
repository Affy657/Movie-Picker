import type { ReactElement } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import EventDetailHeader, {
  type EventDetailHeaderProps,
} from '@/features/events/pages/event-detail/EventDetailHeader';
import { LocaleProvider } from '@/shared/i18n';

function renderHeader(ui: ReactElement) {
  return render(
    <LocaleProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </LocaleProvider>
  );
}

const baseProps: EventDetailHeaderProps = {
  title: 'Soirée ciné',
  dateFormatted: 'lundi 15 juin à 19h00',
  eventTime: '19:00',
  eventDate: '15 juin 2026',
  rawDate: '2026-06-15',
  rawTime: '19:00',
  isFinished: false,
  eventTheme: null,
  shareUrl: 'https://moviepicker.app/e/abc',
  lifecycle: 'upcoming',
  participantCount: 3,
  moviesCount: 2,
  votesCount: 5,
  participantsOpen: false,
  onToggleParticipants: () => {},
};

describe('EventDetailHeader', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
  });

  it('affiche le récap de la soirée et le compte à rebours de début', () => {
    renderHeader(<EventDetailHeader {...baseProps} countdownLabel="22 h" />);
    expect(screen.getByRole('heading', { name: 'Soirée ciné' })).toBeInTheDocument();
    expect(screen.getByText('Commence dans')).toBeInTheDocument();
    expect(screen.getByText('22 h')).toBeInTheDocument();
    expect(screen.getByText('lundi 15 juin à 19h00')).toBeInTheDocument();
    expect(screen.getByText('2 films')).toBeInTheDocument();
    expect(screen.getByText('5 votes')).toBeInTheDocument();
  });

  it('masque la pastille tant que la soirée n’est pas dans les 24 h', () => {
    renderHeader(<EventDetailHeader {...baseProps} />);
    expect(screen.queryByText('Commence dans')).not.toBeInTheDocument();
    expect(screen.queryByText('À venir')).not.toBeInTheDocument();
  });

  it('n’affiche pas de compte à rebours quand la soirée est en cours', () => {
    renderHeader(<EventDetailHeader {...baseProps} lifecycle="live" countdownLabel="22 h" />);
    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.queryByText('22 h')).not.toBeInTheDocument();
  });

  it('regroupe partage et QR dans le menu Inviter, calendrier à part', async () => {
    const user = userEvent.setup();
    renderHeader(<EventDetailHeader {...baseProps} />);

    expect(screen.queryByRole('button', { name: /^partager$/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^inviter$/i }));

    expect(screen.getByRole('button', { name: /^partager$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /afficher le qr code/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /google calendar/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ajouter au calendrier/i }));
    expect(screen.getByRole('menuitem', { name: /google calendar/i })).toBeInTheDocument();
  });

  it('masque le menu de partage pour une soirée terminée', () => {
    renderHeader(<EventDetailHeader {...baseProps} isFinished lifecycle="finished" />);
    expect(screen.getByText('Terminée')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^inviter$/i })).not.toBeInTheDocument();
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

  it('n’expose l’engrenage de réglages que si un gestionnaire est fourni', () => {
    const { unmount } = renderHeader(<EventDetailHeader {...baseProps} />);
    expect(
      screen.queryByRole('button', { name: /paramètres de la soirée/i })
    ).not.toBeInTheDocument();
    unmount();

    renderHeader(<EventDetailHeader {...baseProps} onOpenSettings={() => {}} />);
    expect(screen.getByRole('button', { name: /paramètres de la soirée/i })).toBeInTheDocument();
  });
});
