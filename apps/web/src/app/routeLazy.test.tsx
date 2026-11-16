import { Suspense } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ROUTE_CHUNKS,
  preloadStartupRoute,
  resetLoadedRouteModulesForTests,
  routeLazy,
} from '@/app/routeChunks';

function renderInSuspense(Page: () => React.ReactNode) {
  return render(
    <Suspense fallback={<p>chargement</p>}>
      <Page />
    </Suspense>
  );
}

describe('routeLazy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetLoadedRouteModulesForTests();
  });

  it('renders a page loaded before the first render at once, without the fallback', async () => {
    vi.spyOn(ROUTE_CHUNKS, 'donate').mockResolvedValue({ default: () => <p>soutenir</p> } as never);
    await preloadStartupRoute('/soutenir');

    renderInSuspense(routeLazy('donate') as () => React.ReactNode);

    expect(screen.getByText('soutenir')).toBeInTheDocument();
    expect(screen.queryByText('chargement')).not.toBeInTheDocument();
  });

  it('loads any other page lazily behind the fallback', async () => {
    vi.spyOn(ROUTE_CHUNKS, 'tech').mockResolvedValue({ default: () => <p>coulisses</p> } as never);

    renderInSuspense(routeLazy('tech') as () => React.ReactNode);

    expect(screen.getByText('chargement')).toBeInTheDocument();
    expect(await screen.findByText('coulisses')).toBeInTheDocument();
  });
});
