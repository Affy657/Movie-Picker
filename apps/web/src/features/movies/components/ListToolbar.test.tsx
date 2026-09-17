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
});
