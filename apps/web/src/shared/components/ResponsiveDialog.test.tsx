import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import ResponsiveDialog from './ResponsiveDialog';
import sheetStyles from './Sheet.module.css';

function renderDialog(footer?: ReactNode) {
  const onClose = vi.fn();
  render(
    <LocaleProvider>
      <ResponsiveDialog open title="Noter le film" onClose={onClose} footer={footer}>
        <p>Votre note</p>
      </ResponsiveDialog>
    </LocaleProvider>
  );
  return { onClose, dialog: screen.getByRole('dialog', { name: 'Noter le film' }) };
}

describe('ResponsiveDialog', () => {
  it('opens a modal with its title, body and footer on a large screen', () => {
    stubMatchMedia(false);

    const { dialog } = renderDialog(<button type="button">Enregistrer</button>);

    expect(dialog).not.toHaveClass(sheetStyles.dialog!);
    expect(within(dialog).getByText('Votre note')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument();
  });

  it('opens a sheet with the same title, body and footer on a phone', () => {
    stubMatchMedia(true);

    const { dialog } = renderDialog(<button type="button">Enregistrer</button>);

    expect(dialog).toHaveClass(sheetStyles.dialog!);
    expect(within(dialog).getByText('Votre note')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument();
  });

  it('closes from its close button', async () => {
    stubMatchMedia(false);
    const { onClose, dialog } = renderDialog();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Fermer' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('draws no footer bar when there is no footer', () => {
    stubMatchMedia(false);

    const { dialog } = renderDialog();

    expect(dialog.lastElementChild).toHaveTextContent('Votre note');
  });
});
