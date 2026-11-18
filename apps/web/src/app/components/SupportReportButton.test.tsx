import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import SupportReportButton from '@/app/components/SupportReportButton';
import modalStyles from '@/shared/components/Modal.module.css';
import sheetStyles from '@/shared/components/Sheet.module.css';
import { stubMatchMedia } from '@/test-utils/matchMedia';
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
    vi.unstubAllGlobals();
  });

  it('the dialog is closed at first', () => {
    const { container } = renderButton();
    expect(container.querySelector('dialog')).toBeNull();
  });

  it('opens the dialog on click', async () => {
    const { container } = renderButton();
    await openDialog();

    await waitFor(() => {
      expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    });
    expect(screen.getByRole('heading', { name: /signaler un problème/i })).toBeInTheDocument();
  });

  it('offers the pre-filled message with the technical context of the current page', async () => {
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

  it('invites to copy by hand when the clipboard is blocked', async () => {
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

  it('keeps the actions out of the scrolling area', async () => {
    renderButton();
    await openDialog();

    const report = await screen.findByLabelText(/message à envoyer/i);
    const scrollArea = report.closest(`.${modalStyles.body}`);
    expect(scrollArea).not.toBeNull();

    const mailLink = screen.getByRole('link', { name: /ouvrir ma messagerie/i });
    const copyButton = screen.getByRole('button', { name: /copier le message/i });
    expect(scrollArea).not.toContainElement(mailLink);
    expect(scrollArea).not.toContainElement(copyButton);
    expect(mailLink.closest(`.${modalStyles.footer}`)).not.toBeNull();
    expect(copyButton.closest(`.${modalStyles.footer}`)).not.toBeNull();
  });

  it('puts the mail app, the main action, last in the row of actions', async () => {
    renderButton();
    await openDialog();

    const mailLink = await screen.findByRole('link', { name: /ouvrir ma messagerie/i });
    const actions = mailLink.closest(`.${modalStyles.actions}`);
    expect(actions).not.toBeNull();
    expect(actions?.lastElementChild).toBe(mailLink);
    expect(actions).toContainElement(screen.getByRole('button', { name: /copier le message/i }));
  });

  it('opens as a sheet with a drag handle on a phone', async () => {
    stubMatchMedia((query) => query.includes('max-width'));
    renderButton();
    await openDialog();

    const dialog = await screen.findByRole('dialog', { name: /signaler un problème/i });
    expect(dialog).toHaveClass(sheetStyles.dialog!);
    expect(dialog).toHaveAccessibleDescription(/envoyez-nous le message ci-dessous/i);
    expect(screen.getByRole('link', { name: /ouvrir/i })).toBeInTheDocument();
  });

  it('describes the dialog with its intro', async () => {
    renderButton();
    await openDialog();

    expect(
      await screen.findByRole('dialog', { name: /signaler un problème/i })
    ).toHaveAccessibleDescription(/envoyez-nous le message ci-dessous/i);
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
