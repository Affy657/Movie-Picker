import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { AppTestProviders } from '@/test-utils/queryWrapper';

// jsdom n'implémente pas l'API native de <dialog> : on la stub a minima
// pour pouvoir tester l'ouverture/fermeture pilotée par la prop `open`.
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '');
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
});

describe('ConfirmDialog', () => {
  it('ouvre la modale quand `open` passe à true et expose les libellés fournis', () => {
    const { rerender } = render(
      <AppTestProviders>
        <ConfirmDialog
          open={false}
          title="Retirer Bob"
          message="Action irréversible."
          confirmLabel="Retirer"
          cancelLabel="Annuler"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </AppTestProviders>
    );

    const dialog = screen.getByTestId('confirm-dialog');
    expect(dialog.hasAttribute('open')).toBe(false);

    rerender(
      <AppTestProviders>
        <ConfirmDialog
          open
          title="Retirer Bob"
          message="Action irréversible."
          confirmLabel="Retirer"
          cancelLabel="Annuler"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </AppTestProviders>
    );

    expect(dialog.hasAttribute('open')).toBe(true);
    expect(screen.getByText('Retirer Bob')).toBeInTheDocument();
    expect(screen.getByText('Action irréversible.')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-dialog-confirm')).toHaveTextContent('Retirer');
    expect(screen.getByTestId('confirm-dialog-cancel')).toHaveTextContent('Annuler');
  });

  it('appelle onConfirm puis onCancel selon le bouton cliqué', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <AppTestProviders>
        <ConfirmDialog
          open
          title="Quitter"
          message="Sûr·e ?"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </AppTestProviders>
    );

    await user.click(screen.getByTestId('confirm-dialog-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId('confirm-dialog-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('désactive uniquement Confirmer quand `busy=true` (Annuler reste actif)', () => {
    render(
      <AppTestProviders>
        <ConfirmDialog open title="x" message="y" busy onConfirm={vi.fn()} onCancel={vi.fn()} />
      </AppTestProviders>
    );

    // Confirmer désactivé pour empêcher un double envoi…
    expect(screen.getByTestId('confirm-dialog-confirm')).toBeDisabled();
    // …mais Annuler reste utilisable pour ne pas bloquer l'utilisateur si la
    // mutation est lente (la mutation déjà partie continue en arrière-plan).
    expect(screen.getByTestId('confirm-dialog-cancel')).not.toBeDisabled();
  });

  it('propage la fermeture native (Escape) vers onCancel quand la modale est ouverte', () => {
    const onCancel = vi.fn();
    render(
      <AppTestProviders>
        <ConfirmDialog open title="x" message="y" onConfirm={vi.fn()} onCancel={onCancel} />
      </AppTestProviders>
    );

    const dialog = screen.getByTestId('confirm-dialog') as HTMLDialogElement;
    act(() => {
      dialog.close();
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
