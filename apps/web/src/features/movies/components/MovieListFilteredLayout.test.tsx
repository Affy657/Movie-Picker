import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import MovieListFilteredLayout, { type MovieListFilters } from './MovieListFilteredLayout';

function filters(overrides: Partial<MovieListFilters> = {}): MovieListFilters {
  return {
    filtersOpen: false,
    setFiltersOpen: vi.fn(),
    selectedGenres: [],
    toggleGenre: vi.fn(),
    selectedMediaTypes: [],
    toggleMediaType: vi.fn(),
    selectedDecade: undefined,
    toggleDecade: vi.fn(),
    clearAllFilters: vi.fn(),
    resetAll: vi.fn(),
    activeFilterChips: [],
    visibleCount: 3,
    ...overrides,
  };
}

function renderLayout(state: MovieListFilters, isMobile = false) {
  return render(
    <LocaleProvider>
      <MovieListFilteredLayout
        toolbar={<div data-testid="toolbar" />}
        filters={state}
        filtersPanelId="filters"
        tmdbLanguage="fr-FR"
        isMobile={isMobile}
      >
        <ul data-testid="grid" />
      </MovieListFilteredLayout>
    </LocaleProvider>
  );
}

describe('MovieListFilteredLayout', () => {
  it('rend la barre et la grille, sans panneau tant que les filtres sont fermés', () => {
    renderLayout(filters());

    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('grid')).toBeInTheDocument();
    expect(document.getElementById('filters')).toBeNull();
  });

  it('ouvre le panneau de filtres sur bureau, avec le lien pour tout effacer', async () => {
    const user = userEvent.setup();
    const state = filters({ filtersOpen: true });
    renderLayout(state);

    expect(document.getElementById('filters')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /réinitialiser/i }));
    expect(state.clearAllFilters).toHaveBeenCalled();
  });

  it('montre les pastilles actives et retire un filtre depuis une pastille', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderLayout(filters({ activeFilterChips: [{ key: 'g-28', label: 'Action', onRemove }] }));

    expect(screen.getByText('Action')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retirer/i }));
    expect(onRemove).toHaveBeenCalled();
  });

  it('remplace la grille par un état vide quand rien ne passe les filtres', async () => {
    const user = userEvent.setup();
    const state = filters({ visibleCount: 0 });
    renderLayout(state);

    expect(screen.queryByTestId('grid')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /réinitialiser/i }));
    expect(state.resetAll).toHaveBeenCalled();
  });

  it('passe par une feuille sur mobile', () => {
    renderLayout(filters({ filtersOpen: true }), true);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3 films/i })).toBeInTheDocument();
  });
});
