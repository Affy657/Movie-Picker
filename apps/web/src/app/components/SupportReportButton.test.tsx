import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import SupportReportButton from '@/app/components/SupportReportButton';
import { LocaleProvider } from '@/shared/i18n';
import { SUPPORT_EMAIL } from '@/shared/support/supportMailto';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';

vi.mock('@/shared/utils/copyTextToClipboard', () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(true),
}));

function renderButton(path = '/e/soiree-cine') {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[path]}>
        <SupportReportButton />
      </MemoryRouter>
    </LocaleProvider>
  );
}

async function openDialog() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /signaler un problème/i }));
  return user;
}

describe('SupportReportButton', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    vi.mocked(copyTextToClipboard).mockReset();
    vi.mocked(copyTextToClipboard).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('la boîte de dialogue est fermée au départ', () => {
    const { container } = renderButton();
    expect(container.querySelector('dialog')).toBeNull();
  });

  it('ouvre la boîte de dialogue au clic', async () => {
    const { container } = renderButton();
    await openDialog();

    await waitFor(() => {
      expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    });
    expect(screen.getByRole('heading', { name: /signaler un problème/i })).toBeInTheDocument();
  });

  it('propose le message pré-rempli avec le contexte technique de la page courante', async () => {
    renderButton('/e/soiree-cine');
    await openDialog();

    const report = await screen.findByLabelText(/message à envoyer/i);
    expect(report).toHaveAttribute('readonly');
    const value = (report as HTMLTextAreaElement).value;
    expect(value).toContain(SUPPORT_EMAIL);
    expect(value).toContain('Page : /e/soiree-cine');
    expect(value).toContain('Version :');
    expect(value).toContain('Navigateur :');
  });

  it('garde le lien mailto comme action principale', async () => {
    renderButton();
    await openDialog();

    const mailLink = await screen.findByRole('link', { name: /ouvrir ma messagerie/i });
    expect(mailLink.getAttribute('href')).toContain(`mailto:${SUPPORT_EMAIL}?`);
  });

  it('copie le message et confirme quand la messagerie est indisponible', async () => {
    renderButton();
    const user = await openDialog();

    await user.click(screen.getByRole('button', { name: /copier le message/i }));

    await waitFor(() => {
      expect(copyTextToClipboard).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('status')).toHaveTextContent(/message copié/i);
    });
    expect(vi.mocked(copyTextToClipboard).mock.calls[0]?.[0]).toContain(SUPPORT_EMAIL);
  });

  it('invite à copier à la main quand le presse-papier est bloqué', async () => {
    vi.mocked(copyTextToClipboard).mockResolvedValue(false);
    renderButton();
    const user = await openDialog();

    await user.click(screen.getByRole('button', { name: /copier le message/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/copie impossible/i);
    });
  });

  it('affiche l’adresse de support en repli', async () => {
    renderButton();
    await openDialog();

    const hint = await screen.findByText(
      (_content, element) =>
        element?.tagName === 'P' && (element.textContent ?? '').includes(SUPPORT_EMAIL)
    );
    expect(hint).toBeInTheDocument();
  });

  it('se ferme via le bouton de fermeture', async () => {
    const { container } = renderButton();
    const user = await openDialog();

    await waitFor(() => {
      expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    });

    await user.click(screen.getByRole('button', { name: /^fermer$/i }));

    await waitFor(() => {
      expect(container.querySelector('dialog')).toBeNull();
    });
  });
});
