import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsentDialog from './ConsentDialog';
import buttonStyles from './Button.module.css';
import modalStyles from './Modal.module.css';
import { AppTestProviders } from '@/test-utils/queryWrapper';

describe('ConsentDialog', () => {
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

  it('accepte tout et ferme', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <AppTestProviders>
        <ConsentDialog open onClose={onClose} />
      </AppTestProviders>
    );

    await user.click(screen.getByRole('button', { name: /tout accepter/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('refuse tout et ferme', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <AppTestProviders>
        <ConsentDialog open onClose={onClose} />
      </AppTestProviders>
    );

    await user.click(screen.getByRole('button', { name: /tout refuser/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('saves the analytics preferences', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <AppTestProviders>
        <ConsentDialog open onClose={onClose} />
      </AppTestProviders>
    );

    await user.click(screen.getByRole('checkbox', { name: /analyse/i }));
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('describes itself with its intro paragraph', () => {
    render(
      <AppTestProviders>
        <ConsentDialog open onClose={vi.fn()} />
      </AppTestProviders>
    );

    expect(screen.getByRole('dialog', { name: 'Gestion des cookies' })).toHaveAccessibleDescription(
      /gérez vos préférences par catégorie/i
    );
  });

  it('scrolls the categories above a footer that keeps the three choices in reach', () => {
    render(
      <AppTestProviders>
        <ConsentDialog open onClose={vi.fn()} />
      </AppTestProviders>
    );

    expect(screen.getByRole('dialog')).toHaveClass(modalStyles.column!);
    const body = screen.getByRole('list').closest(`.${modalStyles.body}`);
    expect(body).not.toBeNull();

    const accept = screen.getByRole('button', { name: /tout accepter/i });
    expect(body).not.toContainElement(accept);
    const footer = accept.closest<HTMLElement>(`.${modalStyles.footer}`);
    expect(footer).not.toBeNull();
    const choices = within(footer!).getAllByRole('button');
    expect(choices.map((choice) => choice.textContent)).toEqual([
      'Tout refuser',
      'Enregistrer mes préférences',
      'Tout accepter',
    ]);
    for (const choice of choices) expect(choice).not.toHaveClass(buttonStyles.sm!);
  });
});
