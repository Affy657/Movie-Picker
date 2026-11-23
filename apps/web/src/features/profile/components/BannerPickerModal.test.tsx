import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BannerPickerModal from './BannerPickerModal';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { ApiError } from '@/shared/api/apiError';
import { searchMovies } from '@/features/movies/api/moviesApi';
import { fetchMovieBackdrops, type ProfileBanner } from '@/features/profile/api/profileApi';
import { loadBannerPhoto, renderBannerPhoto } from '@/features/profile/utils/bannerPhotoFile';
import { BANNER_SUGGESTIONS } from '@/features/profile/utils/bannerSuggestions';

vi.mock('@/features/movies/api/moviesApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/movies/api/moviesApi')>();
  return { ...actual, searchMovies: vi.fn() };
});

vi.mock('@/features/profile/api/profileApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/profile/api/profileApi')>();
  return { ...actual, fetchMovieBackdrops: vi.fn() };
});

vi.mock('@/features/profile/utils/bannerPhotoFile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/profile/utils/bannerPhotoFile')>();
  return { ...actual, loadBannerPhoto: vi.fn(), renderBannerPhoto: vi.fn() };
});

const DUNE = BANNER_SUGGESTIONS[0]!;

const FILM_BANNER: ProfileBanner = {
  source: 'film',
  imageUrl: `https://image.tmdb.org/t/p/w1280${DUNE.imagePath}`,
  tmdbId: DUNE.tmdbId,
  title: DUNE.title.fr,
};

const PHOTO_URL = '/api/v1/banners/0123456789abcdef0123456789abcdef';

function renderPicker(overrides: Partial<Parameters<typeof BannerPickerModal>[0]> = {}) {
  const props = {
    open: true,
    banner: null,
    photoUrl: null,
    onChoose: vi.fn().mockResolvedValue(undefined),
    onRemove: vi.fn().mockResolvedValue(undefined),
    onUploadPhoto: vi.fn().mockResolvedValue(undefined),
    onDeletePhoto: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    ...overrides,
  };
  render(
    <AppTestProviders>
      <BannerPickerModal {...props} />
    </AppTestProviders>
  );
  return props;
}

function jpeg(name = 'banner.jpg', bytes = 2048): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/jpeg' });
}

beforeEach(() => {
  vi.mocked(searchMovies).mockReset();
  vi.mocked(fetchMovieBackdrops).mockReset();
  vi.mocked(loadBannerPhoto).mockReset();
  vi.mocked(renderBannerPhoto).mockReset();
  vi.mocked(loadBannerPhoto).mockResolvedValue({
    image: document.createElement('img'),
    url: 'blob:banner',
    width: 1920,
    height: 1080,
  });
  vi.mocked(renderBannerPhoto).mockResolvedValue(new Blob(['webp'], { type: 'image/webp' }));
});

describe('BannerPickerModal', () => {
  it('opens on the films, with the suggestions and the current banner selected', () => {
    renderPicker({ banner: FILM_BANNER });

    expect(screen.getByRole('tab', { name: 'Films' })).toHaveAttribute('aria-selected', 'true');
    const suggestions = screen.getByRole('radiogroup', { name: 'Suggestions' });
    expect(within(suggestions).getAllByRole('radio')).toHaveLength(BANNER_SUGGESTIONS.length);
    expect(
      within(suggestions).getByRole('radio', { name: 'Dune : Deuxième partie (2024)' })
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('opens on my image when it is the banner', () => {
    renderPicker({
      banner: { source: 'photo', imageUrl: PHOTO_URL, tmdbId: null, title: null },
      photoUrl: PHOTO_URL,
    });

    expect(screen.getByRole('tab', { name: 'Mon image' })).toHaveAttribute('aria-selected', 'true');
  });

  it('applies a suggestion at once and closes', async () => {
    const props = renderPicker();

    await userEvent.click(screen.getByRole('radio', { name: 'La La Land (2016)' }));

    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
    expect(props.onChoose).toHaveBeenCalledWith({
      source: 'film',
      tmdbId: 313369,
      imagePath: '/nlPCdZlHtRNcF6C9hzUH4ebmV1w.jpg',
    });
  });

  it('finds any film and lets the user pick one of its images', async () => {
    vi.mocked(searchMovies).mockResolvedValue({
      items: [
        {
          id: 438631,
          mediaType: 'movie',
          title: 'Dune',
          year: '2021',
          posterPath: null,
          voteAverage: null,
          runtimeMinutes: null,
          watchProviders: null,
          tmdbWatchPageUrl: null,
          genreIds: [],
        },
      ],
      watchProvidersRegion: 'FR',
      disclaimer: '',
      tmdbAttributionUrl: '',
    });
    vi.mocked(fetchMovieBackdrops).mockResolvedValue({
      tmdbId: 438631,
      backdrops: [
        {
          path: '/one.jpg',
          thumbnailUrl: 'https://image.tmdb.org/t/p/w780/one.jpg',
          width: 1920,
          height: 1080,
        },
        {
          path: '/two.jpg',
          thumbnailUrl: 'https://image.tmdb.org/t/p/w780/two.jpg',
          width: 1920,
          height: 1080,
        },
      ],
    });
    const props = renderPicker();

    await userEvent.type(screen.getByRole('searchbox', { name: 'Rechercher un film' }), 'dune');
    await userEvent.click(await screen.findByRole('button', { name: /Dune \(2021\)/ }));
    await userEvent.click(await screen.findByRole('radio', { name: 'Image 2 sur 2' }));

    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
    expect(props.onChoose).toHaveBeenCalledWith({
      source: 'film',
      tmdbId: 438631,
      imagePath: '/two.jpg',
    });
  });

  it('says when the search finds no film', async () => {
    vi.mocked(searchMovies).mockResolvedValue({
      items: [],
      watchProvidersRegion: 'FR',
      disclaimer: '',
      tmdbAttributionUrl: '',
    });
    renderPicker();

    await userEvent.type(screen.getByRole('searchbox', { name: 'Rechercher un film' }), 'dnue');

    expect(await screen.findByText('Aucun film trouvé')).toBeInTheDocument();
  });

  it('says when a film has no image to use, and goes back to the films', async () => {
    vi.mocked(fetchMovieBackdrops).mockResolvedValue({ tmdbId: DUNE.tmdbId, backdrops: [] });
    vi.mocked(searchMovies).mockResolvedValue({
      items: [
        {
          id: 1,
          mediaType: 'movie',
          title: 'Sans image',
          year: '1990',
          posterPath: null,
          voteAverage: null,
          runtimeMinutes: null,
          watchProviders: null,
          tmdbWatchPageUrl: null,
          genreIds: [],
        },
      ],
      watchProvidersRegion: 'FR',
      disclaimer: '',
      tmdbAttributionUrl: '',
    });
    renderPicker();

    await userEvent.type(screen.getByRole('searchbox', { name: 'Rechercher un film' }), 'sans');
    await userEvent.click(await screen.findByRole('button', { name: /Sans image \(1990\)/ }));

    expect(
      await screen.findByText('Ce film n’a pas d’image utilisable comme bannière.')
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retour aux films' }));
    expect(screen.getByRole('searchbox', { name: 'Rechercher un film' })).toHaveValue('sans');
  });

  it('keeps the window open and says why when the banner could not be saved', async () => {
    const props = renderPicker({
      onChoose: vi.fn().mockRejectedValue(
        new ApiError('Cette image n’appartient pas à ce film.', {
          code: 400,
          reason: 'profile_banner_invalid',
        })
      ),
    });

    await userEvent.click(screen.getByRole('radio', { name: 'La La Land (2016)' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette image n’appartient pas à ce film.'
    );
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('removes the banner from the footer, only when there is one', async () => {
    const props = renderPicker({ banner: FILM_BANNER });

    await userEvent.click(screen.getByRole('button', { name: 'Retirer la bannière' }));

    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
    expect(props.onRemove).toHaveBeenCalled();
  });

  it('offers no removal without a banner', () => {
    renderPicker();

    expect(screen.queryByRole('button', { name: 'Retirer la bannière' })).not.toBeInTheDocument();
  });

  it('imports an image, crops it in landscape and saves it', async () => {
    const props = renderPicker();
    await userEvent.click(screen.getByRole('tab', { name: 'Mon image' }));

    fireEvent.change(screen.getByTestId('banner-photo-input'), { target: { files: [jpeg()] } });
    await userEvent.click(await screen.findByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
    expect(props.onUploadPhoto).toHaveBeenCalledWith(expect.any(Blob));
    expect(vi.mocked(renderBannerPhoto).mock.calls[0]![1].width).toBeGreaterThan(0);
  });

  it('refuses an image that is too small before cropping it', async () => {
    const { AvatarPhotoFileRejection } = await import('@/features/auth/utils/avatarPhotoFile');
    vi.mocked(loadBannerPhoto).mockRejectedValue(new AvatarPhotoFileRejection('tooSmall'));
    renderPicker();
    await userEvent.click(screen.getByRole('tab', { name: 'Mon image' }));

    fireEvent.change(screen.getByTestId('banner-photo-input'), { target: { files: [jpeg()] } });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette image est trop petite : il faut 1280 × 720 px au moins.'
    );
  });

  it('asks to wait after too many imports', async () => {
    renderPicker({
      onUploadPhoto: vi.fn().mockRejectedValue(new ApiError('slow down', { code: 429 })),
    });
    await userEvent.click(screen.getByRole('tab', { name: 'Mon image' }));

    fireEvent.change(screen.getByTestId('banner-photo-input'), { target: { files: [jpeg()] } });
    await userEvent.click(await screen.findByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Vous avez importé plusieurs images d’affilée. Réessayez dans quelques minutes.'
    );
  });

  it('brings back a kept image as the banner', async () => {
    const props = renderPicker({ banner: FILM_BANNER, photoUrl: PHOTO_URL });
    await userEvent.click(screen.getByRole('tab', { name: 'Mon image' }));

    await userEvent.click(screen.getByRole('radio', { name: 'Utiliser mon image comme bannière' }));

    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
    expect(props.onChoose).toHaveBeenCalledWith({ source: 'photo' });
  });

  it('deletes the kept image after confirmation', async () => {
    const props = renderPicker({ photoUrl: PHOTO_URL });
    await userEvent.click(screen.getByRole('tab', { name: 'Mon image' }));

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer l’image' }));
    const dialog = await screen.findByTestId('banner-photo-delete');
    expect(dialog).toHaveTextContent('Votre bannière actuelle ne change pas.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer l’image' }));

    await waitFor(() => expect(props.onDeletePhoto).toHaveBeenCalled());
  });
});
