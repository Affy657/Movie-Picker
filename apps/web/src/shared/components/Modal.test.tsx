import { describe, it, expect, vi, beforeAll } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '@/shared/components/Modal';
import styles from '@/shared/components/Modal.module.css';
import { AppTestProviders } from '@/test-utils/queryWrapper';

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

describe('Modal', () => {
  it('only opens the dialog when `open` turns true', () => {
    const { rerender } = render(
      <AppTestProviders>
        <Modal open={false} onClose={vi.fn()} data-testid="m" ariaLabel="Fenêtre">
          <p>Contenu</p>
        </Modal>
      </AppTestProviders>
    );

    expect(screen.getByTestId('m').hasAttribute('open')).toBe(false);

    rerender(
      <AppTestProviders>
        <Modal open onClose={vi.fn()} data-testid="m" ariaLabel="Fenêtre">
          <p>Contenu</p>
        </Modal>
      </AppTestProviders>
    );

    expect(screen.getByTestId('m').hasAttribute('open')).toBe(true);
  });

  it('affiche une barre de titre et ferme au clic sur le bouton de fermeture', async () => {
    const onClose = vi.fn();
    render(
      <AppTestProviders>
        <Modal open onClose={onClose} title="Paramètres" closeAriaLabel="Fermer" data-testid="m">
          <p>Contenu</p>
        </Modal>
      </AppTestProviders>
    );

    const dialog = screen.getByTestId('m');
    const heading = screen.getByRole('heading', { name: 'Paramètres' });
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);

    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('relaie labelledBy et describedBy quand le contenu porte son propre titre', () => {
    render(
      <AppTestProviders>
        <Modal open onClose={vi.fn()} ariaLabelledBy="t" ariaDescribedBy="d" data-testid="m">
          <h2 id="t">Titre local</h2>
          <p id="d">Description</p>
        </Modal>
      </AppTestProviders>
    );

    const dialog = screen.getByTestId('m');
    expect(dialog.getAttribute('aria-labelledby')).toBe('t');
    expect(dialog.getAttribute('aria-describedby')).toBe('d');
    expect(dialog.getAttribute('aria-label')).toBeNull();
  });

  it('closes when the dialog emits its native close event', () => {
    const onClose = vi.fn();
    render(
      <AppTestProviders>
        <Modal open onClose={onClose} ariaLabel="Fenêtre" data-testid="m">
          <p>Contenu</p>
        </Modal>
      </AppTestProviders>
    );

    screen.getByTestId('m').dispatchEvent(new Event('close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('takes its width from the container scale, sm by default', () => {
    render(
      <AppTestProviders>
        <Modal open onClose={vi.fn()} ariaLabel="Petite" data-testid="small">
          <p>Contenu</p>
        </Modal>
        <Modal open onClose={vi.fn()} ariaLabel="Large" size="lg" data-testid="large">
          <p>Contenu</p>
        </Modal>
      </AppTestProviders>
    );

    expect(screen.getByTestId('small').className).toContain(styles.sizeSm);
    expect(screen.getByTestId('large').className).toContain(styles.sizeLg);
  });

  it('refuses a dialog without an accessible name at compile time', () => {
    render(
      <AppTestProviders>
        {/* @ts-expect-error a dialog is named by title, ariaLabelledBy or ariaLabel */}
        <Modal open onClose={vi.fn()} data-testid="m">
          <p>Contenu</p>
        </Modal>
      </AppTestProviders>
    );

    expect(screen.getByTestId('m')).not.toHaveAttribute('aria-label');
  });

  describe('outside clicks', () => {
    const dialogBox = {
      x: 100,
      y: 100,
      left: 100,
      top: 100,
      right: 400,
      bottom: 300,
      width: 300,
      height: 200,
      toJSON: () => ({}),
    } as DOMRect;

    function renderPaddedModal(onClose: () => void) {
      render(
        <AppTestProviders>
          <Modal open onClose={onClose} ariaLabel="Fenêtre" padded data-testid="m">
            <p>Contenu</p>
          </Modal>
        </AppTestProviders>
      );
      const dialog = screen.getByTestId('m');
      vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(dialogBox);
      return dialog;
    }

    it('closes on a click on the backdrop', () => {
      const onClose = vi.fn();
      const dialog = renderPaddedModal(onClose);

      fireEvent.pointerDown(dialog, { clientX: 20, clientY: 20 });
      fireEvent.click(dialog, { clientX: 20, clientY: 20 });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('stays open on a click in its own padding', () => {
      const onClose = vi.fn();
      const dialog = renderPaddedModal(onClose);

      fireEvent.pointerDown(dialog, { clientX: 110, clientY: 110 });
      fireEvent.click(dialog, { clientX: 110, clientY: 110 });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('stays open when a text selection started inside is released over the backdrop', () => {
      const onClose = vi.fn();
      const dialog = renderPaddedModal(onClose);

      fireEvent.pointerDown(screen.getByText('Contenu'), { clientX: 150, clientY: 150 });
      fireEvent.click(dialog, { clientX: 20, clientY: 20 });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('stays open when a press on the backdrop is released inside the dialog', () => {
      const onClose = vi.fn();
      const dialog = renderPaddedModal(onClose);

      fireEvent.pointerDown(dialog, { clientX: 20, clientY: 20 });
      fireEvent.click(dialog, { clientX: 110, clientY: 110 });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it('refuses an empty title at compile time, it would leave the dialog nameless', () => {
    const emptyTitle = { title: null };
    render(
      <AppTestProviders>
        {/* @ts-expect-error a title is a text or an element, never an empty node */}
        <Modal open onClose={vi.fn()} data-testid="m" {...emptyTitle}>
          <p>Contenu</p>
        </Modal>
      </AppTestProviders>
    );

    expect(screen.getByTestId('m')).not.toHaveAttribute('aria-labelledby');
  });
});
