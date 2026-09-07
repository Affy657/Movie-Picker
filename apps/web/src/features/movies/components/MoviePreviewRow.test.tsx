import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/shared/i18n';
import MoviePreviewRow, { MoviePreviewRail } from './MoviePreviewRow';
import MoviePosterCard from './MoviePosterCard';

function mockRailMetrics(scrollWidth: number, clientWidth: number) {
  vi.spyOn(HTMLUListElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth);
  vi.spyOn(HTMLUListElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth);
}

function mockScrollBy() {
  const scrollBy = vi.fn();
  Object.defineProperty(HTMLUListElement.prototype, 'scrollBy', {
    configurable: true,
    writable: true,
    value: scrollBy,
  });
  return scrollBy;
}

function renderRow(itemCount: number) {
  return render(
    <LocaleProvider>
      <MemoryRouter>
        <MoviePreviewRow
          heading="Tendances de la semaine"
          subtitle="Les films dont tout le monde parle"
          seeAllTo="/films/tendances"
          seeAllLabel="Voir les 100 films"
        >
          <MoviePreviewRail size="md" itemCount={itemCount}>
            {Array.from({ length: itemCount }, (_, index) => (
              <MoviePosterCard
                key={index}
                title={`Film ${index}`}
                meta="2024"
                onSelect={() => undefined}
              />
            ))}
          </MoviePreviewRail>
        </MoviePreviewRow>
      </MemoryRouter>
    </LocaleProvider>
  );
}

describe('MoviePreviewRow', () => {
  afterEach(() => vi.restoreAllMocks());

  it('expose son titre, son sous-titre et son lien Tout voir', () => {
    mockRailMetrics(0, 0);
    renderRow(2);

    expect(
      screen.getByRole('heading', { name: /tendances de la semaine/i, level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByText(/tout le monde parle/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voir les 100 films/i })).toHaveAttribute(
      'href',
      '/films/tendances'
    );
  });

  it('rattache la rangée à son titre', () => {
    mockRailMetrics(0, 0);
    renderRow(2);

    expect(screen.getByRole('region', { name: /tendances de la semaine/i })).toBeInTheDocument();
  });

  it('laisse chaque carte atteignable, même hors de la zone visible', () => {
    mockRailMetrics(2000, 400);
    const { container } = renderRow(12);

    const cards = Array.from(container.querySelectorAll('li'));
    expect(cards).toHaveLength(12);
    for (const card of cards) {
      expect(card).not.toHaveAttribute('inert');
      expect(card).not.toHaveAttribute('aria-hidden');
    }
  });

  it('affiche les flèches et fait défiler la rangée quand elle déborde', async () => {
    mockRailMetrics(2000, 400);
    const scrollBy = mockScrollBy();
    renderRow(12);

    const forward = screen.getByRole('button', { name: /vers la droite/i });
    expect(forward).toBeEnabled();
    expect(screen.getByRole('button', { name: /vers la gauche/i })).toBeDisabled();

    await userEvent.click(forward);

    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 320 }));
  });

  it('masque les flèches quand tout tient dans la largeur', () => {
    mockRailMetrics(400, 400);
    renderRow(2);

    expect(screen.queryByRole('button', { name: /vers la droite/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /vers la gauche/i })).not.toBeInTheDocument();
  });

  it("annonce le rang aux lecteurs d'écran, pas seulement le chiffre", () => {
    mockRailMetrics(0, 0);
    render(
      <LocaleProvider>
        <MemoryRouter>
          <MoviePreviewRow heading="Les plus proposés">
            <MoviePreviewRail size="md" itemCount={1}>
              <MoviePosterCard title="Film" meta="2024" rank={1} rankLabel="Rang 1" />
            </MoviePreviewRail>
          </MoviePreviewRow>
        </MemoryRouter>
      </LocaleProvider>
    );

    expect(screen.getByText('Rang 1')).toBeInTheDocument();
  });
});
