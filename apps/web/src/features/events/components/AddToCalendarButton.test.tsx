import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddToCalendarButton from '@/features/events/components/AddToCalendarButton';
import { LocaleProvider } from '@/shared/i18n';

function renderButton(ui: ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

const props = {
  title: 'Soirée ciné',
  date: '2026-06-15',
  time: '19:00',
  url: 'https://moviepicker.app/e/abc',
};

describe('AddToCalendarButton', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('affiche le bouton et garde le menu fermé au départ', () => {
    renderButton(<AddToCalendarButton {...props} />);
    const trigger = screen.getByRole('button', { name: /ajouter au calendrier/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ouvre le menu au clic avec Google, Outlook et Apple', async () => {
    const user = userEvent.setup();
    renderButton(<AddToCalendarButton {...props} />);
    await user.click(screen.getByRole('button', { name: /ajouter au calendrier/i }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ajouter au calendrier/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    const google = screen.getByRole('menuitem', { name: /google calendar/i });
    expect(google).toHaveAttribute('href', expect.stringContaining('calendar.google.com'));
    expect(google).toHaveAttribute('target', '_blank');
    expect(google).toHaveAttribute('rel', 'noopener noreferrer');

    const outlook = screen.getByRole('menuitem', { name: /outlook/i });
    expect(outlook).toHaveAttribute('href', expect.stringContaining('outlook.live.com'));

    expect(screen.getByRole('menuitem', { name: /apple calendar/i })).toBeInTheDocument();
  });

  it('télécharge un fichier .ics au clic sur Apple Calendar', async () => {
    const user = userEvent.setup();
    renderButton(<AddToCalendarButton {...props} />);
    await user.click(screen.getByRole('button', { name: /ajouter au calendrier/i }));
    await user.click(screen.getByRole('menuitem', { name: /apple calendar/i }));

    expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ne rend rien quand la date est invalide', () => {
    const { container } = renderButton(<AddToCalendarButton {...props} date="" />);
    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByRole('button', { name: /ajouter au calendrier/i })
    ).not.toBeInTheDocument();
  });
});
