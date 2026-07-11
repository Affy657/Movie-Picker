import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QrCodeButton from '@/shared/components/QrCodeButton';

const BASE_PROPS = {
  url: 'https://example.com/u/alice',
  dialogTitle: 'QR code — lien vers le profil',
  hint: "Ouvrez l'appareil photo pour accéder au profil sur mobile.",
  showLabel: 'Afficher le QR code du profil',
  closeLabel: 'Fermer le QR code',
};

describe('QrCodeButton', () => {
  it('affiche le bouton avec le libellé fourni, fermé par défaut', () => {
    const { container } = render(<QrCodeButton {...BASE_PROPS} />);
    const button = screen.getByRole('button', { name: BASE_PROPS.showLabel });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');

    const dialog = container.querySelector('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog?.hasAttribute('open')).toBe(false);
  });

  it('applique la classe par défaut "btn" quand aucune className n’est fournie', () => {
    render(<QrCodeButton {...BASE_PROPS} />);
    expect(screen.getByRole('button', { name: BASE_PROPS.showLabel })).toHaveClass('btn');
  });

  it('ouvre la modale au clic et affiche le titre, l’indice et l’URL', async () => {
    const user = userEvent.setup();
    const { container } = render(<QrCodeButton {...BASE_PROPS} />);
    const dialog = container.querySelector('dialog');

    await user.click(screen.getByRole('button', { name: BASE_PROPS.showLabel }));

    await waitFor(() => {
      expect(dialog?.hasAttribute('open')).toBe(true);
    });
    expect(screen.getByRole('heading', { name: BASE_PROPS.dialogTitle })).toBeInTheDocument();
    expect(screen.getByText(BASE_PROPS.hint)).toBeInTheDocument();
    expect(screen.getByText(BASE_PROPS.url)).toBeInTheDocument();
  });

  it('affiche displayUrl à la place de url quand fourni', async () => {
    const user = userEvent.setup();
    render(<QrCodeButton {...BASE_PROPS} displayUrl="example.com/u/alice" />);

    await user.click(screen.getByRole('button', { name: BASE_PROPS.showLabel }));

    await waitFor(() => {
      expect(screen.getByText('example.com/u/alice')).toBeInTheDocument();
    });
    expect(screen.queryByText(BASE_PROPS.url)).not.toBeInTheDocument();
  });

  it('ferme la modale au clic sur le bouton de fermeture', async () => {
    const user = userEvent.setup();
    const { container } = render(<QrCodeButton {...BASE_PROPS} />);
    const dialog = container.querySelector('dialog');

    await user.click(screen.getByRole('button', { name: BASE_PROPS.showLabel }));
    await waitFor(() => expect(dialog?.hasAttribute('open')).toBe(true));

    await user.click(screen.getByRole('button', { name: BASE_PROPS.closeLabel }));
    await waitFor(() => expect(dialog?.hasAttribute('open')).toBe(false));
  });

  it('ferme la modale avec Échap', async () => {
    const user = userEvent.setup();
    const { container } = render(<QrCodeButton {...BASE_PROPS} />);
    const dialog = container.querySelector('dialog');

    await user.click(screen.getByRole('button', { name: BASE_PROPS.showLabel }));
    await waitFor(() => expect(dialog?.hasAttribute('open')).toBe(true));

    await user.keyboard('{Escape}');
    await waitFor(() => expect(dialog?.hasAttribute('open')).toBe(false));
  });

  it('ferme la modale au clic sur le fond (backdrop)', async () => {
    const user = userEvent.setup();
    const { container } = render(<QrCodeButton {...BASE_PROPS} />);
    const dialog = container.querySelector('dialog') as HTMLDialogElement;

    await user.click(screen.getByRole('button', { name: BASE_PROPS.showLabel }));
    await waitFor(() => expect(dialog.hasAttribute('open')).toBe(true));

    await user.click(dialog);
    await waitFor(() => expect(dialog.hasAttribute('open')).toBe(false));
  });
});
