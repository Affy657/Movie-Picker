import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsentDialog from './ConsentDialog';
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

  it('enregistre les préférences analytics', async () => {
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
});
