import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import LibraryMovieRow, {
  LibraryMovieRowHeader,
} from '@/features/movies/components/LibraryMovieRow';
import { LocaleProvider } from '@/shared/i18n';

type RowProps = ComponentProps<typeof LibraryMovieRow>;

function renderRow(props: Partial<RowProps> = {}) {
  return render(
    <LocaleProvider>
      <ul>
        <LibraryMovieRow
          title="Dune"
          year="2021"
          posterPath="/dune.jpg"
          voteAverage={8.1}
          ratingScale="ten"
          runtimeMinutes={155}
          onOpenDetails={() => undefined}
          {...props}
        />
      </ul>
    </LocaleProvider>
  );
}

type SortKey = 'createdAt' | 'title' | 'voteAverage' | 'duration' | 'year' | 'availability';

function renderHeader(props: Partial<ComponentProps<typeof LibraryMovieRowHeader<SortKey>>> = {}) {
  const onSetSort = vi.fn();
  render(
    <LocaleProvider>
      <LibraryMovieRowHeader<SortKey>
        sorts={{
          title: [
            { key: 'createdAt', label: 'Ajout' },
            { key: 'title', label: 'Titre' },
          ],
          vote: { key: 'voteAverage', label: 'Note' },
          runtime: { key: 'duration', label: 'Durée' },
          year: { key: 'year', label: 'Sortie' },
          availability: { key: 'availability', label: 'Dispo' },
        }}
        sortBy="createdAt"
        sortDir="desc"
        onSetSort={onSetSort}
        {...props}
      />
    </LocaleProvider>
  );
  return onSetSort;
}

describe('LibraryMovieRow', () => {
  it('lays the title, the vote, the runtime and the year out as table cells', () => {
    renderRow();

    const row = screen.getByRole('listitem');
    expect(within(row).getByRole('heading', { name: 'Dune', level: 3 })).toBeInTheDocument();
    expect(within(row).getByText('8.1/10')).toBeInTheDocument();
    expect(within(row).getByText('2h35')).toBeInTheDocument();
    expect(within(row).getByText('2021')).toBeInTheDocument();
  });

  it('opens the details from the whole row and names the trigger after the movie', async () => {
    const onOpenDetails = vi.fn();
    renderRow({ onOpenDetails });

    await userEvent.click(screen.getByRole('button', { name: 'Voir les détails de « Dune »' }));

    expect(onOpenDetails).toHaveBeenCalledTimes(1);
  });

  it('shows the genres and the badge under the title, nothing when both are absent', () => {
    const { unmount } = renderRow({ genres: ['Drame', 'Thriller'], badge: <span>Série</span> });
    expect(screen.getByText('Drame, Thriller')).toBeInTheDocument();
    expect(screen.getByText('Série')).toBeInTheDocument();
    unmount();

    renderRow();
    expect(screen.queryByText(/,/)).toBeNull();
  });

  it('keeps the kebab after the cells on desktop and drops it on mobile', () => {
    const desktop = renderRow({ kebab: <button type="button">kebab</button> });
    const heading = desktop.getByRole('heading', { name: 'Dune' });
    const kebab = desktop.getByRole('button', { name: 'kebab' });
    expect(heading.compareDocumentPosition(kebab) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    desktop.unmount();

    renderRow({ isMobile: true, kebab: <button type="button">kebab</button> });
    expect(screen.queryByRole('button', { name: 'kebab' })).toBeNull();
    expect(screen.getByText('2021')).toBeInTheDocument();
    expect(screen.getByText('2h35')).toBeInTheDocument();
    expect(screen.getByText('8.1/10')).toBeInTheDocument();
  });

  it('renders the availability slot on desktop and among the mobile facts', () => {
    const desktop = renderRow({ availability: <span>Netflix</span> });
    expect(desktop.getByText('Netflix')).toBeInTheDocument();
    desktop.unmount();

    renderRow({ isMobile: true, availability: <span>Netflix</span> });
    expect(
      screen.getByText('Netflix').closest('span')?.parentElement?.parentElement
    ).toContainElement(screen.getByText('2021'));
  });

  it('forwards the eager hint to the poster', () => {
    const { container } = renderRow({ eager: true });
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('fetchpriority', 'high');
  });
});

describe('LibraryMovieRowHeader', () => {
  it('renders one sort button per column, the active one pressed', () => {
    renderHeader();

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual([
      'Ajout',
      'Titre',
      'Note',
      'Durée',
      'Sortie',
      'Dispo',
    ]);
    expect(screen.getByRole('button', { name: 'Ajout' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Titre' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('sorts on click', async () => {
    const onSetSort = renderHeader();

    await userEvent.click(screen.getByRole('button', { name: 'Sortie' }));

    expect(onSetSort).toHaveBeenCalledWith('year');
  });
});
