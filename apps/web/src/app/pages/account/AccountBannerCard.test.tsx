import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountBannerCard from './AccountBannerCard';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import type { UserProfile } from '@/features/auth/types';

const USER = {
  userId: 'u-me',
  displayName: 'Moi',
  handle: 'moi',
  isProfilePublic: true,
  banner: null,
  bannerPhotoUrl: null,
} as unknown as UserProfile;

function renderCard(user: UserProfile = USER) {
  render(
    <AppTestProviders>
      <AccountBannerCard user={user} />
    </AppTestProviders>
  );
}

describe('AccountBannerCard', () => {
  it('says there is no banner yet and offers to add one', () => {
    renderCard();

    expect(screen.getByRole('region', { name: 'Bannière' })).toHaveTextContent(
      'Affichée en haut de votre profil public.'
    );
    expect(screen.getByText('Aucune bannière pour le moment.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument();
  });

  it('previews the current banner and offers to edit it', () => {
    renderCard({
      ...USER,
      banner: {
        source: 'film',
        imageUrl: 'https://image.tmdb.org/t/p/w1280/sunset.jpg',
        tmdbId: 693134,
        title: 'Dune : Deuxième partie',
      },
    } as UserProfile);

    expect(screen.getByTestId('account-banner-preview')).toHaveAttribute(
      'src',
      'https://image.tmdb.org/t/p/w300/sunset.jpg'
    );
    expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument();
  });

  it('opens the choice of the banner', async () => {
    renderCard();

    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));

    expect(await screen.findByRole('dialog', { name: 'Bannière' })).toBeInTheDocument();
  });
});
