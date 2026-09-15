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
  it('renders one radio per scale and marks the current profile one', () => {
    configure({ userId: 'u1', ratingScale: 'ten' });

    render(<RatingScaleToggle />);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(
      screen.getByRole('radio', { name: 'auth.account.ratingScaleOptions.ten' })
    ).toHaveAttribute('aria-checked', 'true');
  });

  it("by default (no ratingScale on the profile), the 'five' option is selected", () => {
    configure({ userId: 'u1' });

    render(<RatingScaleToggle />);

    expect(
      screen.getByRole('radio', { name: 'auth.account.ratingScaleOptions.five' })
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('does nothing on click without a signed-in user', async () => {
    const { patchProfile } = configure(null);

    render(<RatingScaleToggle />);
    await userEvent.click(
      screen.getByRole('radio', { name: 'auth.account.ratingScaleOptions.ten' })
    );

    expect(patchProfile).not.toHaveBeenCalled();
  });

  it('persists the choice through patchProfile when signed in', async () => {
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

  it('moves to the next option with ArrowRight', () => {
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
