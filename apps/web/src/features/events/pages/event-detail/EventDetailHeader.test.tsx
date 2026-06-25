import type { ReactElement } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
  dateFormatted: '19:00 – 15 juin 2026',
  eventTime: '19:00',
  eventDate: '15 juin 2026',
  rawDate: '2026-06-15',
  rawTime: '19:00',
  isFinished: false,
  eventTheme: null,
  shareUrl: 'https://moviepicker.app/e/abc',
};

describe('EventDetailHeader', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
  });

  it('affiche les actions de partage et le calendrier pour une soirée à venir', () => {
    renderHeader(<EventDetailHeader {...baseProps} />);
    expect(screen.getByRole('button', { name: /partager/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /afficher le qr code/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ajouter au calendrier/i })).toBeInTheDocument();
  });

  it('masque le partage, le QR et le calendrier pour une soirée terminée', () => {
    renderHeader(<EventDetailHeader {...baseProps} isFinished />);
    expect(screen.getByText(/soirée terminée/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /partager/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /afficher le qr code/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /ajouter au calendrier/i })
    ).not.toBeInTheDocument();
  });
});
