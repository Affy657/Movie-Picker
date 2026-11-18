import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import ResponsiveDialog from './ResponsiveDialog';
import sheetStyles from './Sheet.module.css';
import modalStyles from './Modal.module.css';

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

  it('shows a detail line under its title and takes a size for each format', () => {
    stubMatchMedia(false);
    const { unmount } = render(
      <LocaleProvider>
        <ResponsiveDialog
          open
          title="Proposer un film"
          detail={<p>Soirée de vendredi</p>}
          size="md"
          sheetSize="lg"
          onClose={vi.fn()}
        >
          <p>Recherche</p>
        </ResponsiveDialog>
      </LocaleProvider>
    );
    const modal = screen.getByRole('dialog', { name: 'Proposer un film' });
    expect(within(modal).getByText('Soirée de vendredi')).toBeInTheDocument();
    expect(modal).toHaveClass(modalStyles.sizeMd!);
    unmount();

    stubMatchMedia(true);
    render(
      <LocaleProvider>
        <ResponsiveDialog
          open
          title="Proposer un film"
          detail={<p>Soirée de vendredi</p>}
          size="md"
          sheetSize="lg"
          onClose={vi.fn()}
        >
          <p>Recherche</p>
        </ResponsiveDialog>
      </LocaleProvider>
    );
    const sheet = screen.getByRole('dialog', { name: 'Proposer un film' });
    expect(within(sheet).getByText('Soirée de vendredi')).toBeInTheDocument();
    expect(sheet).toHaveClass(sheetStyles.dialogTall!);
  });

  it.each([false, true])('links its description in both formats (phone: %s)', (isPhone) => {
    stubMatchMedia(isPhone);
    render(
      <LocaleProvider>
        <ResponsiveDialog open title="Signaler" ariaDescribedBy="intro" onClose={() => {}}>
          <p id="intro">Copiez le rapport.</p>
        </ResponsiveDialog>
      </LocaleProvider>
    );

    expect(screen.getByRole('dialog', { name: 'Signaler' })).toHaveAccessibleDescription(
      'Copiez le rapport.'
    );
  });

  it('draws no footer bar when there is no footer', () => {
    stubMatchMedia(false);

    const { dialog } = renderDialog();

    expect(dialog.lastElementChild).toHaveTextContent('Votre note');
  });
});
