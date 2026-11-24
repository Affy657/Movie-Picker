import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import DateTimePicker, { type DateTimeValue } from './DateTimePicker';
import {
  centeredScrollOffset,
  focusableDayIn,
  formatDateTimeLabel,
  monthWeeks,
  parseTypedTime,
  timeSlots,
} from './dateTimePickerModel';

function Harness({
  initial = { date: '2026-11-26', time: '20:30' },
  min = '2026-11-24',
  max = '2028-11-24',
}: Readonly<{
  initial?: DateTimeValue;
  min?: string;
  max?: string;
}>) {
  const [value, setValue] = useState(initial);
  return (
    <LocaleProvider>
      <span id="when-label">Date et heure</span>
      <DateTimePicker
        id="when"
        label="Date et heure"
        value={value}
        onChange={setValue}
        min={min}
        max={max}
        today="2026-11-24"
        ariaLabelledBy="when-label"
      />
      <p data-testid="value">{`${value.date} ${value.time}`}</p>
      <button type="button">Ailleurs</button>
    </LocaleProvider>
  );
}

describe('dateTimePickerModel', () => {
  it('writes the day in full, then the time', () => {
    expect(formatDateTimeLabel({ date: '2026-11-26', time: '20:30' }, 'fr', 2026)).toBe(
      'Jeudi 26 novembre, 20:30'
    );
  });

  it('adds the year once the day is not in the current one', () => {
    expect(formatDateTimeLabel({ date: '2027-01-04', time: '21:00' }, 'fr', 2026)).toBe(
      'Lundi 4 janvier 2027, 21:00'
    );
  });

  it('starts the weeks on Monday', () => {
    const weeks = monthWeeks({ year: 2026, month: 11 });

    expect(weeks[0]?.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(weeks[0]?.[6]?.iso).toBe('2026-11-01');
    expect(weeks.at(-1)?.[0]?.iso).toBe('2026-11-30');
  });

  it('offers every half hour, plus the current time when it is off the grid', () => {
    expect(timeSlots('20:30')).toHaveLength(48);
    expect(timeSlots('20:15')).toContain('20:15');
    expect(timeSlots('20:15').indexOf('20:15')).toBe(timeSlots('20:15').indexOf('20:30') - 1);
  });

  it.each([
    ['20:30', '20:30'],
    ['9h', '09:00'],
    ['21h15', '21:15'],
    ['2030', '20:30'],
    ['25:00', null],
    ['soir', null],
  ])('reads « %s » as %s', (typed, expected) => {
    expect(parseTypedTime(typed)).toBe(expected);
  });

  it('keeps the day number when the month turns, within the month and the bounds', () => {
    expect(focusableDayIn({ year: 2026, month: 12 }, 26, '2026-11-24', '2028-11-24')).toBe(
      '2026-12-26'
    );
    expect(focusableDayIn({ year: 2027, month: 2 }, 31, '2026-11-24', '2028-11-24')).toBe(
      '2027-02-28'
    );
    expect(focusableDayIn({ year: 2026, month: 11 }, 3, '2026-11-24', '2028-11-24')).toBe(
      '2026-11-24'
    );
    expect(focusableDayIn({ year: 2028, month: 11 }, 30, '2026-11-24', '2028-11-24')).toBe(
      '2028-11-24'
    );
  });

  it('centres an option measured from its own list, not from the page', () => {
    expect(
      centeredScrollOffset({
        containerStart: 300,
        containerSize: 240,
        optionStart: 420,
        optionSize: 36,
        scroll: 600,
      })
    ).toBe(618);
  });
});

describe('DateTimePicker', () => {
  it('names its trigger by the label and the chosen day', () => {
    stubMatchMedia(false);
    render(<Harness />);

    expect(
      screen.getByRole('button', { name: 'Date et heure Jeudi 26 novembre, 20:30' })
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('picks a day in the calendar and keeps the panel open for the time', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /^date et heure/i }));
    const panel = screen.getByRole('group', { name: 'Date et heure' });
    await user.click(within(panel).getByRole('button', { name: 'vendredi 27 novembre 2026' }));

    expect(screen.getByTestId('value')).toHaveTextContent('2026-11-27 20:30');
    expect(
      within(panel).getByRole('button', { name: 'vendredi 27 novembre 2026' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'Date et heure' })).toBeInTheDocument();
  });

  it('closes on a time and gives the focus back to the field', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /^date et heure/i }));
    await user.click(screen.getByRole('button', { name: '21:00' }));

    expect(screen.getByTestId('value')).toHaveTextContent('2026-11-26 21:00');
    expect(screen.queryByRole('group', { name: 'Date et heure' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^date et heure/i })).toHaveFocus();
  });

  it('announces a panel on a computer and a dialog only on a phone', () => {
    stubMatchMedia(false);
    const { unmount } = render(<Harness />);
    expect(screen.getByRole('button', { name: /^date et heure/i })).not.toHaveAttribute(
      'aria-haspopup'
    );
    unmount();

    stubMatchMedia(true);
    render(<Harness />);
    expect(screen.getByRole('button', { name: /^date et heure/i })).toHaveAttribute(
      'aria-haspopup',
      'dialog'
    );
  });

  it('puts a single time in the tab order and moves through the times with the arrows', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /^date et heure/i }));
    const times = screen.getByRole('group', { name: 'Heures proposées' });
    const tabbable = within(times)
      .getAllByRole('button')
      .filter((button) => button.tabIndex === 0);

    expect(tabbable.map((button) => button.textContent)).toEqual(['20:30']);
    within(times).getByRole('button', { name: '20:30' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(within(times).getByRole('button', { name: '21:00' })).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(within(times).getByRole('button', { name: '20:00' })).toHaveFocus();
    expect(within(times).getByRole('button', { name: '20:00' })).toHaveAttribute('tabindex', '0');
  });

  it('takes a time typed by hand', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /^date et heure/i }));
    const typed = screen.getByRole('textbox', { name: 'Heure' });
    await user.clear(typed);
    await user.type(typed, '21h15{Enter}');

    expect(screen.getByTestId('value')).toHaveTextContent('2026-11-26 21:15');
  });

  it('closes when the host clicks elsewhere', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /^date et heure/i }));
    await user.click(screen.getByRole('button', { name: 'Ailleurs' }));

    expect(screen.queryByRole('group', { name: 'Date et heure' })).not.toBeInTheDocument();
  });

  it('keeps the days out of bounds out of reach', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /^date et heure/i }));
    const panel = screen.getByRole('group', { name: 'Date et heure' });

    expect(within(panel).getByRole('button', { name: 'lundi 23 novembre 2026' })).toBeDisabled();
    expect(within(panel).getByRole('button', { name: 'Mois précédent' })).toBeDisabled();
    expect(within(panel).getByRole('button', { name: 'mardi 24 novembre 2026' })).toHaveAttribute(
      'aria-current',
      'date'
    );
  });

  it('turns the months', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /^date et heure/i }));
    const panel = screen.getByRole('group', { name: 'Date et heure' });
    await user.click(within(panel).getByRole('button', { name: 'Mois suivant' }));
    await user.click(within(panel).getByRole('button', { name: 'jeudi 24 décembre 2026' }));

    expect(screen.getByTestId('value')).toHaveTextContent('2026-12-24 20:30');
    expect(within(panel).getByText('Décembre 2026')).toBeInTheDocument();
  });

  it('reaches a day of the new month with Tab once the month has turned', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /^date et heure/i }));
    const panel = screen.getByRole('group', { name: 'Date et heure' });
    await user.click(within(panel).getByRole('button', { name: 'Mois suivant' }));
    await user.tab();

    expect(within(panel).getByRole('button', { name: 'samedi 26 décembre 2026' })).toHaveFocus();
  });

  it('moves between days with the arrows', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /^date et heure/i }));
    screen.getByRole('button', { name: 'jeudi 26 novembre 2026' }).focus();
    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('button', { name: 'jeudi 3 décembre 2026' })).toHaveFocus();
  });

  it('jumps to the ends of the week and to the next or previous month', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(<Harness min="2026-11-01" />);

    await user.click(screen.getByRole('button', { name: /^date et heure/i }));
    screen.getByRole('button', { name: 'jeudi 26 novembre 2026' }).focus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('button', { name: 'lundi 23 novembre 2026' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('button', { name: 'dimanche 29 novembre 2026' })).toHaveFocus();
    await user.keyboard('{PageDown}');
    expect(screen.getByRole('button', { name: 'mardi 29 décembre 2026' })).toHaveFocus();
    await user.keyboard('{PageUp}{PageUp}');
    expect(screen.getByRole('button', { name: 'dimanche 1 novembre 2026' })).toHaveFocus();
  });

  it('opens a sheet on a phone and applies the choice only once validated', async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /^date et heure/i }));
    const sheet = screen.getByRole('dialog', { name: 'Date et heure' });
    await user.click(within(sheet).getByRole('button', { name: 'samedi 28 novembre 2026' }));
    await user.click(within(sheet).getByRole('button', { name: '21:30' }));

    expect(screen.getByTestId('value')).toHaveTextContent('2026-11-26 20:30');
    await user.click(within(sheet).getByRole('button', { name: 'Valider' }));

    expect(screen.getByTestId('value')).toHaveTextContent('2026-11-28 21:30');
  });

  it('takes a time typed by hand in the sheet of a phone', async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /^date et heure/i }));
    const sheet = screen.getByRole('dialog', { name: 'Date et heure' });
    const typed = within(sheet).getByRole('textbox', { name: 'Heure' });
    await user.clear(typed);
    await user.type(typed, '20h45{Enter}');

    expect(within(sheet).getByRole('button', { name: '20:45' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('value')).toHaveTextContent('2026-11-26 20:30');
    await user.click(within(sheet).getByRole('button', { name: 'Valider' }));

    expect(screen.getByTestId('value')).toHaveTextContent('2026-11-26 20:45');
  });

  it('drops the choice of a sheet closed without validating', async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /^date et heure/i }));
    const sheet = screen.getByRole('dialog', { name: 'Date et heure' });
    await user.click(within(sheet).getByRole('button', { name: 'samedi 28 novembre 2026' }));
    await user.click(within(sheet).getByRole('button', { name: 'Fermer' }));

    expect(screen.getByTestId('value')).toHaveTextContent('2026-11-26 20:30');
  });
});
