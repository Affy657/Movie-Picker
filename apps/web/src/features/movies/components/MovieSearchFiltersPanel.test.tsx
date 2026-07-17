import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import MovieSearchFiltersPanel from './MovieSearchFiltersPanel';
import {
  MOVIE_GENRE_IDS,
  DECADE_OPTIONS,
  VOTE_MIN_OPTIONS,
  LANGUAGE_OPTIONS,
  AVAILABILITY_OPTIONS,
} from './movieSearchFilterOptions';

type PanelProps = Parameters<typeof MovieSearchFiltersPanel>[0];

function renderPanel(overrides: Partial<PanelProps> = {}) {
  const props: PanelProps = {
    panelId: 'filters-panel',
    tmdbLanguage: 'fr',
    selectedGenres: [],
    selectedDecade: undefined,
    voteMin: undefined,
    selectedLanguage: undefined,
    availabilityFilter: undefined,
    runtimeRange: [10, 180],
    onToggleGenre: vi.fn(),
    onToggleDecade: vi.fn(),
    onToggleVoteMin: vi.fn(),
    onToggleLanguage: vi.fn(),
    onToggleAvailability: vi.fn(),
    onChangeRuntimeRange: vi.fn(),
    ...overrides,
  };
  render(
    <LocaleProvider>
      <MovieSearchFiltersPanel {...props} />
    </LocaleProvider>
  );
  return props;
}

describe('MovieSearchFiltersPanel', () => {
  it('rend un bouton par option de chaque groupe', () => {
    renderPanel();
    const total =
      MOVIE_GENRE_IDS.length +
      DECADE_OPTIONS.length +
      VOTE_MIN_OPTIONS.length +
      LANGUAGE_OPTIONS.length +
      AVAILABILITY_OPTIONS.length;
    expect(screen.getAllByRole('button')).toHaveLength(total);
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2020s' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '★ 3+' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Français' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Streaming' })).toBeInTheDocument();
  });

  it('reflete les selections via aria-pressed', () => {
    renderPanel({
      selectedGenres: [28],
      selectedDecade: '2020',
      voteMin: 6,
      selectedLanguage: 'fr',
      availabilityFilter: 'flatrate',
    });
    expect(screen.getByRole('button', { name: 'Action' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Comédie' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: '2020s' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '★ 3+' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Français' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Streaming' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('appelle les callbacks au clic', async () => {
    const user = userEvent.setup();
    const props = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Action' }));
    expect(props.onToggleGenre).toHaveBeenCalledWith(28);
    await user.click(screen.getByRole('button', { name: '2010s' }));
    expect(props.onToggleDecade).toHaveBeenCalledWith('2010');
    await user.click(screen.getByRole('button', { name: '★ 4+' }));
    expect(props.onToggleVoteMin).toHaveBeenCalledWith(8);
    await user.click(screen.getByRole('button', { name: 'Français' }));
    expect(props.onToggleLanguage).toHaveBeenCalledWith('fr');
    await user.click(screen.getByRole('button', { name: 'Streaming' }));
    expect(props.onToggleAvailability).toHaveBeenCalledWith('flatrate');
  });

  it('affiche les libelles anglais quand tmdbLanguage=en', () => {
    renderPanel({ tmdbLanguage: 'en' });
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rental' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Purchase' })).toBeInTheDocument();
  });

  it('masque les groupes genre/langue/disponibilité quand leur callback est omis', () => {
    renderPanel({
      onToggleGenre: undefined,
      onToggleLanguage: undefined,
      onToggleAvailability: undefined,
    });
    expect(screen.queryByText('Genre')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Action' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Français' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Streaming' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2020s' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '★ 3+' })).toBeInTheDocument();
  });

  it('avec ratingScale="ten", affiche le filtre de note minimale sur 10', () => {
    renderPanel({ ratingScale: 'ten' });
    expect(screen.getByRole('button', { name: '★ 6+' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '★ 7+' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '★ 8+' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '★ 3+' })).not.toBeInTheDocument();
  });
});
