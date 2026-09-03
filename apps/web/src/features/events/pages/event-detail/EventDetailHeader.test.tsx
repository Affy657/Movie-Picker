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

  it('affiche le récap de la soirée et le compte à rebours de début', () => {
    renderHeader(<EventDetailHeader {...baseProps} countdownLabel="22 h" />);
    expect(screen.getByRole('heading', { name: 'Soirée ciné' })).toBeInTheDocument();
    expect(screen.getByText('Commence dans')).toBeInTheDocument();
    expect(screen.getByText('22 h')).toBeInTheDocument();
    expect(screen.getByText('lundi 15 juin à 19h00')).toBeInTheDocument();
    expect(screen.getByText('2 films')).toBeInTheDocument();
    expect(screen.getByText('2 votants sur 3')).toBeInTheDocument();
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

  it('affiche le bouton Partager et le calendrier à part', async () => {
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

  it('garde le bouton Partager visible mais masque le calendrier pour une soirée terminée', () => {
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

  it('affiche le thème sous le titre de la soirée', () => {
    renderHeader(<EventDetailHeader {...baseProps} eventTheme="Comédie noire" />);
    const heading = screen.getByRole('heading', { name: 'Soirée ciné' });
    const theme = screen.getByRole('status', { name: /Thème de soirée : Comédie noire/i });
    expect(heading.compareDocumentPosition(theme) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
