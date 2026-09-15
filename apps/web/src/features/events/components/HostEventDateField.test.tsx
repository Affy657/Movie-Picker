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
        hintId="date-hint"
        showNotifyRow={false}
        notifyDateChange={false}
        onValueChange={vi.fn()}
        onNotifyChange={vi.fn()}
      />
    </AppTestProviders>
  );
}

describe('HostEventDateField', () => {
  it('écrit l’aide sous la date comme une phrase, sans commencer par le libellé relatif en minuscule', () => {
    renderField('aujourd’hui');

    const hint = screen.getByText(/Les participants seront prévenus/);
    expect(hint.textContent).toBe(
      'Soirée prévue aujourd’hui. Les participants seront prévenus si vous modifiez la date.'
    );
    expect(screen.getByLabelText('Date et heure de la soirée')).toHaveAttribute(
      'aria-describedby',
      'date-hint'
    );
  });

  it('n’affiche aucune aide sans libellé relatif', () => {
    renderField(null);
    expect(screen.queryByText(/Les participants seront prévenus/)).not.toBeInTheDocument();
  });
});
