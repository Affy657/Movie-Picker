import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import ListToolbar from '@/features/movies/components/ListToolbar';
import { LocaleProvider } from '@/shared/i18n';

type Props = ComponentProps<typeof ListToolbar<'createdAt' | 'title'>>;

function renderToolbar(props: Partial<Props> = {}) {
  return render(
    <LocaleProvider>
      <ListToolbar
        search=""
        onSearchChange={() => undefined}
        searchLabel="Rechercher"
        searchPlaceholder="Rechercher"
        sortOptions={[
          { key: 'createdAt', label: 'Ajout' },
          { key: 'title', label: 'Titre' },
        ]}
        sortBy="createdAt"
        sortDir="desc"
        onSetSort={() => undefined}
        sortLabel="Trier par"
        sortMenuAriaLabel="Trier par"
        sortDirectionAscLabel="Croissant"
        sortDirectionDescLabel="Décroissant"
        isFiltered={false}
        resultCountText=""
        clearAllLabel="Tout effacer"
        onClearAll={() => undefined}
        isMobile={false}
        {...props}
      />
    </LocaleProvider>
  );
}

describe('ListToolbar', () => {
  it('shows the sort control by default', () => {
    renderToolbar();

    expect(screen.getByRole('toolbar', { name: 'Trier par' })).toBeInTheDocument();
  });

  it('hides the sort control when asked, keeping the rest of the toolbar', () => {
    renderToolbar({ hideSort: true, onToggleFilters: () => undefined, filtersLabel: 'Filtres' });

    expect(screen.queryByRole('toolbar', { name: 'Trier par' })).toBeNull();
    expect(screen.getByRole('searchbox', { name: 'Rechercher' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filtres' })).toBeInTheDocument();
  });

  it('puts a control of its own between the filters and the sort', () => {
    renderToolbar({
      onToggleFilters: () => undefined,
      filtersLabel: 'Filtres',
      beforeSort: <button type="button">Tous</button>,
    });

    const filters = screen.getByRole('button', { name: 'Filtres' });
    const own = screen.getByRole('button', { name: 'Tous' });
    const sort = screen.getByRole('toolbar', { name: 'Trier par' });
    expect(filters.compareDocumentPosition(own) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(own.compareDocumentPosition(sort) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
