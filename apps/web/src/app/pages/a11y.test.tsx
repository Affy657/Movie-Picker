import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { axe } from 'vitest-axe';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { authMeGuestHandler } from '@/mocks/handlers';
import LandingPage from '@/app/pages/LandingPage';
import CreateEvent from '@/features/events/pages/CreateEvent';

describe('accessibilité (axe)', () => {
  const server = setupServer(authMeGuestHandler);

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('LandingPage n’a pas de violations', async () => {
    const queryClient = createTestQueryClient();
    const { container } = render(
      <AppTestProviders client={queryClient}>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </AppTestProviders>
    );
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    const results = await axe(container);
    expect(
      results.violations,
      results.violations.map((v) => v.description).join('\n')
    ).toHaveLength(0);
  });

  it('CreateEvent n’a pas de violations', async () => {
    const queryClient = createTestQueryClient();
    const { container } = render(
      <AppTestProviders client={queryClient}>
        <MemoryRouter>
          <CreateEvent />
        </MemoryRouter>
      </AppTestProviders>
    );
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    const results = await axe(container);
    expect(
      results.violations,
      results.violations.map((v) => v.description).join('\n')
    ).toHaveLength(0);
  });
});
