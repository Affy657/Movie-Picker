import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import WhatsNewModal from '@/app/components/WhatsNewModal';
import type { WhatsNewRelease } from '@/shared/whatsNew';

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.open = false;
    };
  }
});

const RELEASE: WhatsNewRelease = {
  version: '1.4.0',
  entries: [
    {
      category: 'new',
      titleKey: 'whatsNew.entries.watchlist.title',
      descriptionKey: 'whatsNew.entries.watchlist.description',
      link: 'watchlist',
    },
    {
      category: 'new',
      titleKey: 'whatsNew.entries.streak.title',
      descriptionKey: 'whatsNew.entries.streak.description',
      link: 'profile',
    },
    {
      category: 'new',
      titleKey: 'whatsNew.entries.proposeIdea.title',
      descriptionKey: 'whatsNew.entries.proposeIdea.description',
      action: 'proposeIdea',
    },
    {
      category: 'improved',
      titleKey: 'whatsNew.entries.wheelExclusion.title',
      descriptionKey: 'whatsNew.entries.wheelExclusion.description',
      link: 'myEvents',
    },
  ],
};

function renderModal(profileHandle: string | null = null, onClose = vi.fn(), onAction = vi.fn()) {
  render(
    <AppTestProviders>
      <MemoryRouter>
        <WhatsNewModal
          open
          release={RELEASE}
          profileHandle={profileHandle}
          onClose={onClose}
          onAction={onAction}
        />
      </MemoryRouter>
    </AppTestProviders>
  );
  return { onClose, onAction };
}

describe('WhatsNewModal', () => {
  it('groups the entries by category and shows title and description', () => {
    renderModal();

    expect(screen.getByRole('heading', { name: /nouveautés/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /améliorations/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByText('Ma liste')).toBeInTheDocument();
    expect(
      screen.getByText('Mettez vos envies de côté, proposez-en une en un clic.')
    ).toBeInTheDocument();
  });

  it('turns an entry into a clickable link when a destination exists, and closes the modal on click', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    const link = screen.getByRole('link', { name: /ma liste/i });
    expect(link).toHaveAttribute('href', '/watchlist');

    await user.click(link);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows no link when the destination cannot be resolved (profile without handle)', () => {
    renderModal(null);

    expect(screen.queryByRole('link', { name: /flamme de série/i })).not.toBeInTheDocument();
    expect(screen.getByText('Flamme de série')).toBeInTheDocument();
  });

  it('resolves the profile link once the handle is known', () => {
    renderModal('utilisateur_dev');

    expect(screen.getByRole('link', { name: /flamme de série/i })).toHaveAttribute(
      'href',
      '/u/utilisateur_dev'
    );
  });

  it('the "Got it" button closes the modal', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole('button', { name: /c.est noté/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens the "Suggest an idea" action and closes the modal on click', async () => {
    const user = userEvent.setup();
    const { onClose, onAction } = renderModal();

    await user.click(screen.getByRole('button', { name: /proposer une idée/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('proposeIdea');
  });
});
