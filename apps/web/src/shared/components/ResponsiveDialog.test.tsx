import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import ResponsiveDialog from './ResponsiveDialog';
import sheetStyles from './Sheet.module.css';
import dialogStyles from './ResponsiveDialog.module.css';

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

  it.each([
    ['a large screen', false],
    ['a phone', true],
  ])('shows the detail under the title on %s', (_name, mobile) => {
    stubMatchMedia(mobile);
    render(
      <LocaleProvider>
        <ResponsiveDialog open title="Proposer un film" detail={<p>Ciné-club</p>} onClose={vi.fn()}>
          <p>Recherche</p>
        </ResponsiveDialog>
      </LocaleProvider>
    );

    const dialog = screen.getByRole('dialog', { name: 'Proposer un film' });
    expect(within(dialog).getByText('Ciné-club')).toBeInTheDocument();
  });

  it('leaves the padding and the footer bar to the content when it is flush', () => {
    stubMatchMedia(false);
    render(
      <LocaleProvider>
        <ResponsiveDialog
          open
          flush
          title="Proposer un film"
          onClose={vi.fn()}
          footer={<div data-testid="own-footer" />}
        >
          <p>Recherche</p>
        </ResponsiveDialog>
      </LocaleProvider>
    );

    const dialog = screen.getByRole('dialog', { name: 'Proposer un film' });
    expect(dialog.lastElementChild).toBe(screen.getByTestId('own-footer'));
    expect(screen.getByText('Recherche').parentElement).toHaveClass(dialogStyles.flushBody!);
  });

  it('puts the tabs in place of the title on a large screen', async () => {
    stubMatchMedia(false);
    const onClose = vi.fn();
    render(
      <LocaleProvider>
        <ResponsiveDialog open title="Abonnements" onClose={onClose} tabs={<p>Onglets</p>}>
          <p>Liste</p>
        </ResponsiveDialog>
      </LocaleProvider>
    );

    const dialog = screen.getByRole('dialog', { name: 'Abonnements' });
    expect(within(dialog).queryByRole('heading')).toBeNull();
    expect(within(dialog).getByText('Onglets')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the title on a phone and puts the tabs on top of the body', () => {
    stubMatchMedia(true);
    render(
      <LocaleProvider>
        <ResponsiveDialog open title="Abonnements" onClose={vi.fn()} tabs={<p>Onglets</p>}>
          <p>Liste</p>
        </ResponsiveDialog>
      </LocaleProvider>
    );

    const dialog = screen.getByRole('dialog', { name: 'Abonnements' });
    expect(within(dialog).getByRole('heading', { name: 'Abonnements' })).toBeInTheDocument();
    const tabs = within(dialog).getByText('Onglets');
    expect(tabs.compareDocumentPosition(within(dialog).getByText('Liste'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });
});
