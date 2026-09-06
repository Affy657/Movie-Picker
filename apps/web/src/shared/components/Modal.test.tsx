import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '@/shared/components/Modal';
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
  it("n'ouvre le dialogue que lorsque `open` passe à true", () => {
    const { rerender } = render(
      <AppTestProviders>
        <Modal open={false} onClose={vi.fn()} testId="m" ariaLabel="Fenêtre">
          <p>Contenu</p>
        </Modal>
      </AppTestProviders>
    );

    expect(screen.getByTestId('m').hasAttribute('open')).toBe(false);

    rerender(
      <AppTestProviders>
        <Modal open onClose={vi.fn()} testId="m" ariaLabel="Fenêtre">
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
        <Modal open onClose={onClose} title="Paramètres" closeLabel="Fermer" testId="m">
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
        <Modal open onClose={vi.fn()} labelledBy="t" describedBy="d" testId="m">
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

  it('ferme quand le dialogue émet son évènement natif close', () => {
    const onClose = vi.fn();
    render(
      <AppTestProviders>
        <Modal open onClose={onClose} ariaLabel="Fenêtre" testId="m">
          <p>Contenu</p>
        </Modal>
      </AppTestProviders>
    );

    screen.getByTestId('m').dispatchEvent(new Event('close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
