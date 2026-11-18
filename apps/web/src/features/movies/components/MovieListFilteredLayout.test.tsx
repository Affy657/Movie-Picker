import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import cardStyles from '@/shared/components/Card.module.css';
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

function renderLayout(
  state: MovieListFilters,
  isMobile = false,
  toolbar = <div data-testid="toolbar" />
) {
  return render(
    <LocaleProvider>
      <MovieListFilteredLayout
        toolbar={toolbar}
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
  it('renders the bar and the grid, without a panel while the filters are closed', () => {
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

  it('replaces the grid with an empty state when nothing passes the filters', async () => {
    const user = userEvent.setup();
    const state = filters({ visibleCount: 0 });
    renderLayout(state);

    expect(screen.queryByTestId('grid')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /réinitialiser/i }));
    expect(state.resetAll).toHaveBeenCalled();
  });

  it('gives the focus back to the filters toggle when Escape closes the panel', async () => {
    const user = userEvent.setup();
    const state = filters({ filtersOpen: true });
    renderLayout(
      state,
      false,
      <button type="button" data-filters-toggle aria-controls="filters">
        Filtres
      </button>
    );

    screen.getByRole('button', { name: /réinitialiser/i }).focus();
    await user.keyboard('{Escape}');

    expect(state.setFiltersOpen).toHaveBeenCalledWith(false);
    expect(screen.getByRole('button', { name: 'Filtres' })).toHaveFocus();
  });

  it('draws the panel as a card inline, and flat inside the phone sheet', () => {
    const { unmount } = renderLayout(filters({ filtersOpen: true }));
    expect(document.getElementById('filters')).toHaveClass(cardStyles.card!);
    unmount();

    renderLayout(filters({ filtersOpen: true }), true);
    const sheet = screen.getByRole('dialog');
    expect(sheet.querySelector('#filters')).not.toHaveClass(cardStyles.card!);
  });

  it('passe par une feuille sur mobile', () => {
    renderLayout(filters({ filtersOpen: true }), true);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3 films/i })).toBeInTheDocument();
  });
});
