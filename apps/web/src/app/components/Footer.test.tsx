import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import Footer from '@/app/components/Footer';
import dropdownStyles from '@/shared/components/Dropdown.module.css';
import { resetPwaInstallRuntime } from '@/shared/hooks/usePwaInstall';
import { resetSessionHintMemoryForTests } from '@/features/auth/session-hint';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { queryKeys } from '@/shared/hooks/queryKeys';
import type { UserProfile } from '@/features/auth/types';
import type { BeforeInstallPromptEvent } from '@/shared/pwa/pwaInstall';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track }),
}));

function renderFooter(user: UserProfile | null = null, path = '/') {
  const client = createTestQueryClient();
  if (user) client.setQueryData(queryKeys.auth.me, user);
  return render(
    <AppTestProviders client={client}>
      <MemoryRouter initialEntries={[path]}>
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
  vi.unstubAllGlobals();
});

beforeEach(() => {
  resetSessionHintMemoryForTests();
  localStorage.removeItem('mp.session-hint');
});

describe('Footer release notes', () => {
  it('links the release notes next to the version, for every visitor', () => {
    renderFooter();

    expect(screen.getByRole('link', { name: 'Journal des versions' })).toHaveAttribute(
      'href',
      '/nouveautes'
    );
    expect(screen.queryByRole('button', { name: /nouveautés/i })).not.toBeInTheDocument();
  });
});

describe('Footer service status', () => {
  it('links the service status page from the help column, for every visitor', () => {
    renderFooter();

    expect(screen.getByRole('link', { name: 'État du service' })).toHaveAttribute(
      'href',
      '/statut'
    );
  });
});

describe('Footer navigation', () => {
  const member = {
    userId: 'u1',
    displayName: 'Alice',
    emailMasked: 'a***@test.local',
    handle: 'alice',
  } as UserProfile;

  it('offers a visitor to create an account rather than pages of a member', async () => {
    renderFooter();

    const nav = screen.getByText('Navigation').parentElement!;
    expect(await within(nav).findByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'href',
      '/register'
    );
    expect(within(nav).getByRole('link', { name: 'J’ai déjà un compte' })).toHaveAttribute(
      'href',
      '/login'
    );
    for (const memberPage of ['Mes soirées', 'Nouvelle soirée', 'Mes listes', 'Paramètres']) {
      expect(within(nav).queryByRole('link', { name: memberPage })).not.toBeInTheDocument();
    }
  });

  it('brings a visitor back to the page the footer was read on', async () => {
    renderFooter(null, '/film/438631-dune');

    const nav = screen.getByText('Navigation').parentElement!;
    expect(await within(nav).findByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'href',
      `/register?returnTo=${encodeURIComponent('/film/438631-dune')}`
    );
    expect(within(nav).getByRole('link', { name: 'J’ai déjà un compte' })).toHaveAttribute(
      'href',
      `/login?returnTo=${encodeURIComponent('/film/438631-dune')}`
    );
  });

  it('offers no visitor link while the session is still being checked', () => {
    localStorage.setItem('mp.session-hint', '1');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined))
    );
    renderFooter();

    const nav = screen.getByText('Navigation').parentElement!;
    expect(within(nav).getByRole('link', { name: 'Accueil' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Créer un compte' })).not.toBeInTheDocument();
    expect(
      within(nav).queryByRole('link', { name: 'J’ai déjà un compte' })
    ).not.toBeInTheDocument();
  });

  it('keeps the pages of a member for a signed-in reader', () => {
    renderFooter(member);

    const nav = screen.getByText('Navigation').parentElement!;
    for (const memberPage of ['Mes soirées', 'Nouvelle soirée', 'Mes listes', 'Paramètres']) {
      expect(within(nav).getByRole('link', { name: memberPage })).toBeInTheDocument();
    }
    expect(within(nav).queryByRole('link', { name: 'Créer un compte' })).not.toBeInTheDocument();
  });
});

describe('Footer source code', () => {
  it('links the GitHub repository of the project, not the author profile', () => {
    renderFooter();

    const link = screen.getByRole('link', { name: 'Code source sur GitHub (nouvel onglet)' });
    expect(link).toHaveAttribute('href', 'https://github.com/Affy657/Movie-Picker');
    expect(link).toHaveTextContent('Code source');
  });
});

describe('Footer language', () => {
  it('switches the interface language from the footer', async () => {
    const user = userEvent.setup();
    renderFooter();

    expect(screen.getByText('Langue')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Langue Français' }));
    expect(screen.getByRole('listbox')).toHaveClass(dropdownStyles.menuUp!);
    await user.click(screen.getByRole('option', { name: 'English' }));

    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Language English' })).toHaveTextContent('English');
    expect(localStorage.getItem('moviepicker-locale')).toBe('en');
  });
});

describe('Footer cookie consent', () => {
  afterEach(() => {
    localStorage.removeItem('moviepicker-consent');
  });

  it('reopens the cookie choices from the legal column once they are made', async () => {
    localStorage.setItem('moviepicker-consent', JSON.stringify({ decided: true, analytics: true }));
    const user = userEvent.setup();
    renderFooter();

    await user.click(screen.getByRole('button', { name: 'Gérer les cookies' }));
    const dialog = screen.getByRole('dialog', { name: 'Gestion des cookies' });
    const analytics = within(dialog).getByRole('checkbox', { name: 'Analyse' });
    expect(analytics).toBeChecked();

    await user.click(analytics);
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer mes préférences' }));

    expect(JSON.parse(localStorage.getItem('moviepicker-consent') ?? 'null')).toEqual({
      decided: true,
      analytics: false,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
