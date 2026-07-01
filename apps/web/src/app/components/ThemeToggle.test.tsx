import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ThemeToggle from '@/app/components/ThemeToggle';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { useAuth } from '@/features/auth/contexts/AuthContext';

vi.mock('@/shared/contexts/ThemeContext', () => ({ useTheme: vi.fn() }));
vi.mock('@/features/auth/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/shared/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const mockUseTheme = vi.mocked(useTheme);
const mockUseAuth = vi.mocked(useAuth);

const setUiPreference = vi.fn();

const configure = (preference = 'system', user: unknown = null, patchProfile = vi.fn()) => {
  mockUseTheme.mockReturnValue({ preference, setUiPreference } as never);
  mockUseAuth.mockReturnValue({ user, patchProfile } as never);
  return { patchProfile };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ThemeToggle', () => {
  it('renders one radio per theme and marks the current one', () => {
    configure('light');

    render(<ThemeToggle />);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'theme.light' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('commits the preference without patching when logged out', async () => {
    const { patchProfile } = configure('system', null);

    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('radio', { name: 'theme.dark' }));

    expect(setUiPreference).toHaveBeenCalledWith('dark');
    expect(patchProfile).not.toHaveBeenCalled();
  });

  it('persists the preference through patchProfile when logged in', async () => {
    const { patchProfile } = configure(
      'system',
      { id: 'u1' },
      vi.fn().mockResolvedValue(undefined)
    );

    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('radio', { name: 'theme.light' }));

    expect(setUiPreference).toHaveBeenCalledWith('light');
    expect(patchProfile).toHaveBeenCalledWith({ uiTheme: 'light' });
  });

  it('rolls back the preference when persistence fails', async () => {
    configure('system', { id: 'u1' }, vi.fn().mockRejectedValue(new Error('nope')));

    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('radio', { name: 'theme.dark' }));

    expect(setUiPreference).toHaveBeenCalledWith('dark');
    await waitFor(() => expect(setUiPreference).toHaveBeenCalledWith('system'));
  });

  it('moves to the next theme with ArrowRight', () => {
    configure('system');

    render(<ThemeToggle />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'theme.system' }), { key: 'ArrowRight' });

    expect(setUiPreference).toHaveBeenCalledWith('light');
  });
});
