import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import RatingScaleToggle from '@/app/components/RatingScaleToggle';
import { useAuth } from '@/features/auth/contexts/AuthContext';

vi.mock('@/features/auth/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/shared/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const mockUseAuth = vi.mocked(useAuth);

const configure = (user: unknown = null, patchProfile = vi.fn()) => {
  mockUseAuth.mockReturnValue({ user, patchProfile } as never);
  return { patchProfile };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RatingScaleToggle', () => {
  it('renders one radio per échelle et marque celle du profil courant', () => {
    configure({ userId: 'u1', ratingScale: 'ten' });

    render(<RatingScaleToggle />);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(
      screen.getByRole('radio', { name: 'auth.account.ratingScaleOptions.ten' })
    ).toHaveAttribute('aria-checked', 'true');
  });

  it("par défaut (pas de ratingScale sur le profil), l'option 'five' est sélectionnée", () => {
    configure({ userId: 'u1' });

    render(<RatingScaleToggle />);

    expect(
      screen.getByRole('radio', { name: 'auth.account.ratingScaleOptions.five' })
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('ne fait rien au clic sans utilisateur connecté', async () => {
    const { patchProfile } = configure(null);

    render(<RatingScaleToggle />);
    await userEvent.click(
      screen.getByRole('radio', { name: 'auth.account.ratingScaleOptions.ten' })
    );

    expect(patchProfile).not.toHaveBeenCalled();
  });

  it('persiste le choix via patchProfile quand connecté', async () => {
    const { patchProfile } = configure(
      { userId: 'u1', ratingScale: 'five' },
      vi.fn().mockResolvedValue(undefined)
    );

    render(<RatingScaleToggle />);
    await userEvent.click(
      screen.getByRole('radio', { name: 'auth.account.ratingScaleOptions.ten' })
    );

    expect(patchProfile).toHaveBeenCalledWith({ ratingScale: 'ten' });
  });

  it('passe à l’option suivante avec ArrowRight', () => {
    const { patchProfile } = configure(
      { userId: 'u1', ratingScale: 'five' },
      vi.fn().mockResolvedValue(undefined)
    );

    render(<RatingScaleToggle />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'auth.account.ratingScaleOptions.five' }), {
      key: 'ArrowRight',
    });

    expect(patchProfile).toHaveBeenCalledWith({ ratingScale: 'ten' });
  });
});
