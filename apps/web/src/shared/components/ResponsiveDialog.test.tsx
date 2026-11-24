import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

  it.each([false, true])(
    'keeps a back button, header actions and tabs in its fixed header (phone: %s)',
    async (isPhone) => {
      stubMatchMedia(isPhone);
      const onBack = vi.fn();
      render(
        <LocaleProvider>
          <ResponsiveDialog
            open
            title="Abonnés et abonnements"
            onClose={vi.fn()}
            leading={
              <button type="button" onClick={onBack}>
                Retour
              </button>
            }
            headerActions={<button type="button">Rechercher</button>}
            tabs={<div data-testid="tabs">Onglets</div>}
          >
            <p>Liste</p>
          </ResponsiveDialog>
        </LocaleProvider>
      );

      const dialog = screen.getByRole('dialog', { name: 'Abonnés et abonnements' });
      expect(within(dialog).getByTestId('tabs')).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Rechercher' })).toBeInTheDocument();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Retour' }));
      expect(onBack).toHaveBeenCalledTimes(1);
    }
  );

  it.each([false, true])(
    'lets a replacement take the title row and stays named by its title (phone: %s)',
    (isPhone) => {
      stubMatchMedia(isPhone);
      render(
        <LocaleProvider>
          <ResponsiveDialog
            open
            title="Abonnés et abonnements"
            onClose={vi.fn()}
            headerReplacement={<input aria-label="Nom ou @pseudo" />}
          >
            <p>Résultats</p>
          </ResponsiveDialog>
        </LocaleProvider>
      );

      const dialog = screen.getByRole('dialog', { name: 'Abonnés et abonnements' });
      expect(within(dialog).getByRole('textbox', { name: 'Nom ou @pseudo' })).toBeInTheDocument();
    }
  );

  it('keeps one height whatever its content with a fixed height', () => {
    stubMatchMedia(false);
    render(
      <LocaleProvider>
        <ResponsiveDialog open title="Partager" fixedHeight="md" onClose={vi.fn()}>
          <p>Lien</p>
        </ResponsiveDialog>
      </LocaleProvider>
    );

    expect(screen.getByRole('dialog', { name: 'Partager' })).toHaveClass(
      modalStyles.fixedHeightMd!
    );
  });

  it('keeps one height on a phone with a fixed height', () => {
    stubMatchMedia(true);
    render(
      <LocaleProvider>
        <ResponsiveDialog open title="Partager" fixedHeight="md" onClose={vi.fn()}>
          <p>Lien</p>
        </ResponsiveDialog>
      </LocaleProvider>
    );

    expect(screen.getByRole('dialog', { name: 'Partager' })).toHaveClass(sheetStyles.fixedHeight!);
  });

  it.each([false, true])(
    'hands the Escape key to onEscape in both formats (phone: %s)',
    (isPhone) => {
      stubMatchMedia(isPhone);
      const onEscape = vi.fn(() => true);
      render(
        <LocaleProvider>
          <ResponsiveDialog open title="QR code" onClose={vi.fn()} onEscape={onEscape}>
            <button type="button">Dedans</button>
          </ResponsiveDialog>
        </LocaleProvider>
      );

      fireEvent.keyDown(screen.getByRole('button', { name: 'Dedans' }), { key: 'Escape' });

      expect(onEscape).toHaveBeenCalledTimes(1);
    }
  );
});
