import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import EventCalendarMenu from './EventCalendarMenu';

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
});
