import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HostEventDateField from '@/features/events/components/HostEventDateField';
import { AppTestProviders } from '@/test-utils/queryWrapper';

function renderField(relativeDateLabel: string | null) {
  return render(
    <AppTestProviders>
      <HostEventDateField
        value="2026-09-14T23:30"
        error={undefined}
        relativeDateLabel={relativeDateLabel}
        showNotifyRow={false}
        notifyDateChange={false}
        onValueChange={vi.fn()}
        onCommit={vi.fn()}
        onNotifyChange={vi.fn()}
      />
    </AppTestProviders>
  );
}

describe('HostEventDateField', () => {
  it('writes the help under the date as a sentence, without starting with the lowercase relative label', () => {
    renderField('aujourd’hui');

    const hint = screen.getByText(/Les participants seront prévenus/);
    expect(hint.textContent).toBe(
      'Soirée prévue aujourd’hui. Les participants seront prévenus si vous modifiez la date.'
    );
    expect(screen.getByLabelText('Date et heure de la soirée')).toHaveAccessibleDescription(
      hint.textContent ?? ''
    );
  });

  it('shows no help without a relative label', () => {
    renderField(null);
    expect(screen.queryByText(/Les participants seront prévenus/)).not.toBeInTheDocument();
  });

  it('bounds the picker between the last start that keeps the night open and two years ahead', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-23T12:00:00Z'));
    try {
      renderField(null);

      const input = screen.getByLabelText('Date et heure de la soirée');
      expect(input).toHaveAttribute('min', '2026-11-16T11:01');
      expect(input).toHaveAttribute('max', '2028-11-23T23:59');
    } finally {
      vi.useRealTimers();
    }
  });

  it('says the time is Paris time when the browser clock is set on another zone', () => {
    const newYork = vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(300);
    try {
      renderField(null);

      expect(
        screen.getByLabelText('Date et heure de la soirée (heure de Paris)')
      ).toBeInTheDocument();
    } finally {
      newYork.mockRestore();
    }
  });
});
