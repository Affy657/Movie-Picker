import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import OAuthProviderButtons from '@/features/auth/components/OAuthProviderButtons';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

describe('OAuthProviderButtons (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => localStorage.setItem('moviepicker-locale', 'fr'));
  afterEach(() => {
    server.resetHandlers();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it("n'affiche rien quand aucun provider n'est configuré", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/oauth/providers`, () => HttpResponse.json({ providers: [] }))
    );

    render(
      <AppTestProviders>
        <OAuthProviderButtons returnTo="/" />
      </AppTestProviders>
    );

    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('affiche un lien par provider configuré, avec le bon returnTo', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/oauth/providers`, () =>
        HttpResponse.json({ providers: ['google', 'github'] })
      )
    );

    render(
      <AppTestProviders>
        <OAuthProviderButtons returnTo="/my-events" />
      </AppTestProviders>
    );

    const googleLink = await screen.findByRole('link', { name: /continuer avec google/i });
    const githubLink = screen.getByRole('link', { name: /continuer avec github/i });

    expect(googleLink).toHaveAttribute(
      'href',
      expect.stringContaining('/auth/oauth/google/start?returnTo=%2Fmy-events')
    );
    expect(githubLink).toHaveAttribute(
      'href',
      expect.stringContaining('/auth/oauth/github/start?returnTo=%2Fmy-events')
    );
  });
});
