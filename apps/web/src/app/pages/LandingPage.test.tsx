import { describe, it, expect, afterAll, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { TEST_API_V1 } from '@/mocks/handlers';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import LandingPage from '@/app/pages/LandingPage';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { SITE_URL } from '@/shared/seo/siteMeta';

vi.mock('@/features/events/components/SpinningWheel', () => ({
  default: () => <div data-testid="spinning-wheel" />,
}));

function renderLanding() {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('LandingPage', () => {
  afterEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
  });

  it('affiche le titre principal et le canonical de sa propre route', () => {
    renderLanding();
    expect(
      screen.getByRole('heading', { name: /choisissez le film de la soirée/i, level: 1 })
    ).toBeInTheDocument();
    expect(document.title).toBe(pageTitle('Comment ça marche'));
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${SITE_URL}/decouvrir`
    );
  });

  it('pointe tous ses CTA vers inscription et connexion', () => {
    renderLanding();
    const main = screen.getByRole('main');
    const register = within(main).getAllByRole('link', { name: /^créer un compte$/i });
    const login = within(main).getAllByRole('link', { name: /^se connecter$/i });
    expect(register.length).toBeGreaterThan(1);
    expect(login.length).toBeGreaterThan(1);
    for (const link of register) expect(link).toHaveAttribute('href', '/register');
    for (const link of login) expect(link).toHaveAttribute('href', '/login');
  });

  it('unfolds the nine sections of the page', () => {
    renderLanding();
    const main = screen.getByRole('main');
    const headings = within(main)
      .getAllByRole('heading', { level: 2 })
      .map((el) => el.textContent);
    expect(headings).toHaveLength(8);
    expect(within(main).getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('exposes the FAQ as accordions, the first one open', () => {
    renderLanding();
    const questions = screen.getAllByText(/\?$/, { selector: 'summary' });
    expect(questions).toHaveLength(6);
    expect(questions[0]?.closest('details')).toHaveAttribute('open');
    expect(questions[1]?.closest('details')).not.toHaveAttribute('open');
  });

  it('affiche la version anglaise quand la locale est en', () => {
    localStorage.setItem('moviepicker-locale', 'en');
    renderLanding();
    expect(
      screen.getByRole('heading', { name: /pick tonight.s film/i, level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /what happens between two movie nights/i, level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByText(/free, no ads, no commitment/i)).toBeInTheDocument();
  });

  describe('signed in', () => {
    const server = setupServer(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u1',
          displayName: 'Alice',
          handle: 'alice',
          emailMasked: 'a***@test.local',
          uiTheme: 'system',
          accentColor: 'default',
        })
      )
    );

    beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    it('the closing call to action offers to create a night instead of signing up or in', async () => {
      renderLanding();
      const main = screen.getByRole('main');
      const finalSection = within(main).getByRole('region', {
        name: /votre prochaine soirée commence ici/i,
      });

      expect(
        await within(finalSection).findByRole('link', { name: /^créer une soirée$/i })
      ).toHaveAttribute('href', '/new');
      expect(within(main).queryByRole('link', { name: /^créer un compte$/i })).toBeNull();
      expect(within(main).queryByRole('link', { name: /^se connecter$/i })).toBeNull();
    });
  });
});
