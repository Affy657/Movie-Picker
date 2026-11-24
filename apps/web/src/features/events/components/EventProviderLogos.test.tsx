import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import type { WatchProviderOffer } from '@/shared/types/movie';
import EventProviderLogos from './EventProviderLogos';

const offer = (name: string, type = 'flatrate', providerId = name.length): WatchProviderOffer => ({
  providerId,
  name,
  type,
  logoPath: `/t/p/original/${providerId}.png`,
});

const SIX = [
  offer('Netflix', 'flatrate', 8),
  offer('Netflix Standard with Ads', 'flatrate', 1796),
  offer('Amazon Prime Video', 'flatrate', 119),
  offer('Disney Plus', 'flatrate', 337),
  offer('HBO Max', 'flatrate', 1899),
  offer('Canal+', 'flatrate', 381),
  offer('Paramount Plus', 'flatrate', 531),
];

function renderLogos(
  providers: WatchProviderOffer[],
  slots = 3,
  watchPageUrl: string | null = 'https://www.themoviedb.org/movie/808-shrek/watch',
  onOpenDetails = vi.fn()
) {
  render(
    <LocaleProvider>
      <EventProviderLogos
        providers={providers}
        slots={slots}
        title="Shrek"
        watchPageUrl={watchPageUrl}
        onOpenDetails={onOpenDetails}
      />
    </LocaleProvider>
  );
}

describe('EventProviderLogos', () => {
  it('shows one logo per subscription family, never the provider names', () => {
    renderLogos([
      offer('Netflix', 'flatrate', 8),
      offer('Netflix Standard with Ads', 'flatrate', 9),
    ]);

    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'Netflix' })).toBeInTheDocument();
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
  });

  it('keeps the last slot for a +N button that lists every subscription by name', async () => {
    renderLogos(SIX, 3);

    expect(screen.getAllByRole('img')).toHaveLength(2);
    const more = screen.getByRole('button', { name: /voir les 6 abonnements de « Shrek »/i });
    expect(more).toHaveTextContent('+4');

    await userEvent.click(more);

    const menu = screen.getByRole('menu', { name: 'Abonnements' });
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent)
    ).toEqual([
      'Netflix',
      'Amazon Prime Video',
      'Disney Plus',
      'HBO Max',
      'Canal+',
      'Paramount Plus',
    ]);
  });

  it('fits four slots in a card', () => {
    renderLogos(SIX, 4);

    expect(screen.getAllByRole('img')).toHaveLength(3);
    expect(
      screen.getByRole('button', { name: /voir les 6 abonnements de « Shrek »/i })
    ).toHaveTextContent('+3');
  });

  it('says Location when the film can be rented, and opens the film page from it', async () => {
    const onOpenDetails = vi.fn();
    renderLogos(
      [offer('Apple TV', 'rent'), offer('Google Play Movies', 'buy')],
      3,
      null,
      onOpenDetails
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Location seulement : voir la fiche de « Shrek »' })
    );
    expect(onOpenDetails).toHaveBeenCalled();
  });

  it('says Achat when the film can only be bought', () => {
    renderLogos([offer('Google Play Movies', 'buy')]);

    expect(screen.getByText('Achat')).toBeInTheDocument();
  });

  it('closes the subscription list without a TMDB link', async () => {
    renderLogos(SIX, 3, null);

    await userEvent.click(screen.getByRole('button', { name: /voir les 6 abonnements/i }));
    const first = screen.getByRole('menuitem', { name: 'Netflix' });
    expect(first).not.toHaveAttribute('href');
    await userEvent.click(first);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('says there is no offer when nothing is listed', () => {
    renderLogos([]);

    expect(screen.getByText('Aucune offre')).toBeInTheDocument();
  });
});
