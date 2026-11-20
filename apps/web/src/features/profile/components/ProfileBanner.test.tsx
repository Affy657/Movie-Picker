import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import ProfileBanner from './ProfileBanner';
import styles from './ProfileBanner.module.css';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import type { ProfileBanner as Banner } from '@/features/profile/api/profileApi';

const FILM: Banner = {
  source: 'film',
  imageUrl: 'https://image.tmdb.org/t/p/w1280/sunset.jpg',
  tmdbId: 693134,
  title: 'Dune : Deuxième partie',
};

const PHOTO: Banner = {
  source: 'photo',
  imageUrl: '/api/v1/banners/0123456789abcdef0123456789abcdef',
  tmdbId: null,
  title: null,
};

function renderBanner(banner: Banner, isOwner = false, onEdit = vi.fn()) {
  render(
    <AppTestProviders>
      <MemoryRouter>
        <ProfileBanner banner={banner} isOwner={isOwner} onEdit={onEdit} />
      </MemoryRouter>
    </AppTestProviders>
  );
  return { onEdit };
}

describe('ProfileBanner', () => {
  it('fades into the colour of its member only when they picked one', () => {
    const { container: tinted } = render(
      <AppTestProviders>
        <MemoryRouter>
          <ProfileBanner banner={FILM} isOwner={false} onEdit={vi.fn()} tinted />
        </MemoryRouter>
      </AppTestProviders>
    );
    const { container: plain } = render(
      <AppTestProviders>
        <MemoryRouter>
          <ProfileBanner banner={FILM} isOwner={false} onEdit={vi.fn()} />
        </MemoryRouter>
      </AppTestProviders>
    );

    expect(tinted.firstElementChild).toHaveClass(styles.tinted!);
    expect(plain.firstElementChild).not.toHaveClass(styles.tinted!);
  });

  it('shows the image of the film, sized for the screen', () => {
    renderBanner(FILM);

    const image = screen.getByTestId('profile-banner-image');
    expect(image).toHaveAttribute('src', FILM.imageUrl);
    expect(image).toHaveAttribute('srcset', expect.stringContaining('/t/p/w780/sunset.jpg 780w'));
    expect(image).toHaveAttribute('alt', '');
  });

  it('credits the film with a link to its page', () => {
    renderBanner(FILM);

    const credit = screen.getByRole('link', {
      name: 'Bannière tirée de Dune : Deuxième partie, voir le film',
    });
    expect(credit).toHaveAttribute('href', '/film/693134-dune-deuxieme-partie');
    expect(credit).toHaveTextContent('Dune : Deuxième partie');
  });

  it('shows an imported image without any credit', () => {
    renderBanner(PHOTO);

    expect(screen.getByTestId('profile-banner-image')).toHaveAttribute(
      'src',
      expect.stringContaining(PHOTO.imageUrl)
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('lets only the owner edit it', async () => {
    const { onEdit } = renderBanner(FILM, true);

    await userEvent.click(screen.getByRole('button', { name: 'Modifier la bannière' }));

    expect(onEdit).toHaveBeenCalled();
  });

  it('shows no edit button to a visitor', () => {
    renderBanner(FILM);

    expect(screen.queryByRole('button', { name: 'Modifier la bannière' })).not.toBeInTheDocument();
  });
});
