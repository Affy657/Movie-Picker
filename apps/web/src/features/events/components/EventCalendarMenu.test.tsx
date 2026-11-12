import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import EventCalendarMenu from './EventCalendarMenu';
import styles from './EventCalendarMenu.module.css';

describe('EventCalendarMenu', () => {
  it('opens a menu with the two web calendars in a new tab and the ics download', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <EventCalendarMenu
          title="Soirée horreur"
          date="2026-10-31"
          time="21:00"
          url="https://example.test/e/horreur"
        />
      </LocaleProvider>
    );

    const trigger = screen.getByRole('button', { name: 'Ajouter au calendrier' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByRole('menu', { name: 'Choisir un calendrier' })).toBeInTheDocument();
    const google = screen.getByRole('menuitem', { name: 'Google Calendar' });
    expect(google).toHaveAttribute('target', '_blank');
    expect(google).toHaveAttribute('rel', 'noopener noreferrer');
    expect(google.getAttribute('href')).toContain('calendar.google.com');
    expect(screen.getByRole('menuitem', { name: 'Outlook' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('menuitem', { name: 'Apple Calendar (.ics)' }).tagName).toBe('BUTTON');
  });

  it('can show a labelled trigger instead of the icon', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <EventCalendarMenu
          title="Soirée horreur"
          date="2026-10-31"
          time="21:00"
          triggerLabel="Calendrier"
        />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Calendrier' }));

    expect(screen.getByRole('menu', { name: 'Choisir un calendrier' })).toBeInTheDocument();
  });

  it('opens above the row that holds it when asked, so a scrolling dialog cannot clip it', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <EventCalendarMenu
          title="Soirée horreur"
          date="2026-10-31"
          time="21:00"
          triggerLabel="Calendrier"
          opensAboveRow
        />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Calendrier' }));

    const menu = screen.getByRole('menu', { name: 'Choisir un calendrier' });
    expect(menu).toHaveClass(styles.panelAboveRow!);
    expect(menu.parentElement).toHaveClass(styles.containerInRow!);
    expect(menu.style.left).toBe('');
  });

  it('opens below its trigger by default', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <EventCalendarMenu title="Soirée horreur" date="2026-10-31" time="21:00" />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Ajouter au calendrier' }));

    expect(screen.getByRole('menu', { name: 'Choisir un calendrier' })).not.toHaveClass(
      styles.panelAboveRow!
    );
  });
});
