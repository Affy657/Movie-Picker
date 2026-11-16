import { Suspense } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import {
  ROUTE_CHUNKS,
  preloadStartupRoute,
  resetLoadedRouteModulesForTests,
  routeLazy,
} from '@/app/routeChunks';

function renderInSuspense(Page: () => React.ReactNode) {
  return render(
    <LocaleProvider>
      <Suspense fallback={<p>chargement</p>}>
        <Page />
      </Suspense>
    </LocaleProvider>
  );
}

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('routeLazy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetLoadedRouteModulesForTests();
  });

  it('renders a page already loaded at once, without any fallback', async () => {
    vi.spyOn(ROUTE_CHUNKS, 'donate').mockResolvedValue({ default: () => <p>soutenir</p> } as never);
    preloadStartupRoute('/soutenir');
    await settle();

    renderInSuspense(routeLazy('donate') as () => React.ReactNode);

    expect(screen.getByText('soutenir')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('chargement')).not.toBeInTheDocument();
  });

  it('keeps the startup page out of Suspense, so the layout around it paints before it loads', async () => {
    let resolveChunk!: (module: unknown) => void;
    vi.spyOn(ROUTE_CHUNKS, 'donate').mockReturnValue(
      new Promise((resolve) => {
        resolveChunk = resolve;
      }) as never
    );
    preloadStartupRoute('/soutenir');

    renderInSuspense(routeLazy('donate') as () => React.ReactNode);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('chargement')).not.toBeInTheDocument();
    await act(async () => resolveChunk({ default: () => <p>soutenir</p> }));
    expect(screen.getByText('soutenir')).toBeInTheDocument();
    expect(screen.queryByText('chargement')).not.toBeInTheDocument();
  });

  it('falls back to lazy loading when the startup page did not load', async () => {
    vi.spyOn(ROUTE_CHUNKS, 'donate')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ default: () => <p>soutenir</p> } as never);
    preloadStartupRoute('/soutenir');

    renderInSuspense(routeLazy('donate') as () => React.ReactNode);

    expect(await screen.findByText('soutenir')).toBeInTheDocument();
  });

  it('loads any other page lazily behind the fallback', async () => {
    vi.spyOn(ROUTE_CHUNKS, 'tech').mockResolvedValue({ default: () => <p>coulisses</p> } as never);

    renderInSuspense(routeLazy('tech') as () => React.ReactNode);

    expect(screen.getByText('chargement')).toBeInTheDocument();
    expect(await screen.findByText('coulisses')).toBeInTheDocument();
  });
});
