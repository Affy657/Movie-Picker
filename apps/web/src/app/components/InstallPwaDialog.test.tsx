import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallPwaDialog from '@/app/components/InstallPwaDialog';
import { AppTestProviders } from '@/test-utils/queryWrapper';

function renderDialog(mode: 'ios' | 'in_app' | 'generic', onClose = vi.fn()) {
  return {
    onClose,
    ...render(
      <AppTestProviders>
        <InstallPwaDialog open mode={mode} onClose={onClose} />
      </AppTestProviders>
    ),
  };
}

describe('InstallPwaDialog', () => {
  it('affiche les étapes iOS', () => {
    renderDialog('ios');
    expect(
      screen.getByRole('heading', { name: /ajouter à l['’]écran d['’]accueil/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/bouton partager/i)).toBeInTheDocument();
    expect(screen.getByText(/sur l['’]écran d['’]accueil/i)).toBeInTheDocument();
  });

  it('propose de copier le lien en navigateur in-app', () => {
    renderDialog('in_app');

    expect(screen.getByRole('heading', { name: /ouvrir dans le navigateur/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copier le lien/i })).toBeInTheDocument();
  });

  it('ferme la modale générique via le bouton principal', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog('generic');

    const closeButtons = screen.getAllByRole('button', { name: /fermer/i });
    const primaryClose = closeButtons.at(-1);
    if (!primaryClose) throw new Error('missing close button');
    await user.click(primaryClose);
    expect(onClose).toHaveBeenCalled();
  });
});
