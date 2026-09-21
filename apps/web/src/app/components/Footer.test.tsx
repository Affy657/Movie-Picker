import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import Footer from '@/app/components/Footer';
import dropdownStyles from '@/shared/components/Dropdown.module.css';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { resetPwaInstallRuntime } from '@/shared/hooks/usePwaInstall';
import { resetSessionHintMemoryForTests } from '@/features/auth/session-hint';
import type { BeforeInstallPromptEvent } from '@/shared/pwa/pwaInstall';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track }),
}));

function renderFooter() {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    </AppTestProviders>
  );
}

function dispatchBeforeInstallPrompt(
  outcome: 'accepted' | 'dismissed' = 'accepted'
): BeforeInstallPromptEvent {
  const event = new Event('beforeinstallprompt', {
    cancelable: true,
  }) as BeforeInstallPromptEvent;
  Object.assign(event, {
    prompt: vi.fn(async () => {}),
    userChoice: Promise.resolve({ outcome }),
  });
  window.dispatchEvent(event);
  return event;
}

afterEach(() => {
  resetPwaInstallRuntime();
  track.mockClear();
});

beforeEach(() => {
  resetSessionHintMemoryForTests();
  localStorage.removeItem('mp.session-hint');
});

describe('Footer language', () => {
  it('switches the interface language from the footer', async () => {
    const user = userEvent.setup();
    renderFooter();

    expect(screen.getByText('Langue')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Langue' }));
    expect(screen.getByRole('listbox')).toHaveClass(dropdownStyles.menuUp!);
    await user.click(screen.getByRole('option', { name: 'English' }));

    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Language' })).toHaveTextContent('English');
    expect(localStorage.getItem('moviepicker-locale')).toBe('en');
  });
});

describe('Footer PWA install', () => {
  it('affiche le bouton d’installation sous le slogan', () => {
    renderFooter();
    expect(screen.getByRole('button', { name: /installer l['’]app/i })).toBeInTheDocument();
  });

  it('opens the generic guide on click without a native prompt', async () => {
    const user = userEvent.setup();
    renderFooter();

    await user.click(screen.getByRole('button', { name: /installer l['’]app/i }));

    expect(
      await screen.findByRole('heading', { name: /installer movie picker/i })
    ).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('pwa_install_clicked', {
      surface: 'footer',
      mode: 'generic',
    });
    expect(track).toHaveBeenCalledWith('pwa_install_guide_shown', {
      surface: 'footer',
      mode: 'generic',
    });
  });

  it('triggers the native prompt when beforeinstallprompt is available', async () => {
    const user = userEvent.setup();
    renderFooter();
    const event = dispatchBeforeInstallPrompt('accepted');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /installer l['’]app/i })).not.toHaveAttribute(
        'aria-haspopup'
      )
    );

    await user.click(screen.getByRole('button', { name: /installer l['’]app/i }));

    await waitFor(() => expect(event.prompt).toHaveBeenCalledTimes(1));
    expect(track).toHaveBeenCalledWith('pwa_install_clicked', {
      surface: 'footer',
      mode: 'native',
    });
    expect(track).toHaveBeenCalledWith('pwa_install_accepted', { surface: 'footer' });
    expect(
      screen.queryByRole('heading', { name: /installer movie picker/i })
    ).not.toBeInTheDocument();
  });
});

describe('Footer theme control', () => {
  afterEach(() => {
    localStorage.removeItem('moviepicker-ui-preference');
    delete document.documentElement.dataset.theme;
  });

  it('exposes a theme group labelled Appearance with one option per theme', () => {
    renderFooter();

    const group = screen.getByRole('radiogroup', { name: /apparence/i });
    expect(group).toBeInTheDocument();
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
    expect(within(group).getByRole('radio', { name: /système/i })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('applies and remembers the chosen theme', async () => {
    const user = userEvent.setup();
    renderFooter();

    await user.click(screen.getByRole('radio', { name: /clair/i }));

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('moviepicker-ui-preference')).toBe('light');
  });
});
