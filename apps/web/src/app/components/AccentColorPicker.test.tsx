import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AccentColorPicker from '@/app/components/AccentColorPicker';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { useAuth } from '@/features/auth/contexts/AuthContext';

vi.mock('@/shared/contexts/ThemeContext', () => ({ useTheme: vi.fn() }));
vi.mock('@/features/auth/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/shared/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const mockUseTheme = vi.mocked(useTheme);
const mockUseAuth = vi.mocked(useAuth);

const setAccent = vi.fn();

const green = () => screen.getByRole('radio', { name: 'auth.account.accentColorOptions.green' });

const configure = (accent = 'blue', user: unknown = null, patchProfile = vi.fn()) => {
  mockUseTheme.mockReturnValue({ accent, setAccent } as never);
  mockUseAuth.mockReturnValue({ user, patchProfile } as never);
  return { patchProfile };
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AccentColorPicker', () => {
  it('renders eight swatches with the current one selected', () => {
    configure('blue');

    render(<AccentColorPicker />);

    expect(screen.getAllByRole('radio')).toHaveLength(8);
    expect(
      screen.getByRole('radio', { name: 'auth.account.accentColorOptions.blue' })
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('commits immediately without patching when logged out', async () => {
    const { patchProfile } = configure('blue', null);

    render(<AccentColorPicker />);
    await userEvent.click(green());

    expect(setAccent).toHaveBeenCalledWith('green');
    expect(patchProfile).not.toHaveBeenCalled();
  });

  it('ignores a click on the already-selected swatch', async () => {
    configure('blue', null);

    render(<AccentColorPicker />);
    await userEvent.click(
      screen.getByRole('radio', { name: 'auth.account.accentColorOptions.blue' })
    );

    expect(setAccent).not.toHaveBeenCalled();
  });

  it('debounces a profile patch when logged in', async () => {
    const { patchProfile } = configure(
      'blue',
      { userId: 'u1' },
      vi.fn().mockResolvedValue(undefined)
    );

    render(<AccentColorPicker />);
    await userEvent.click(green());

    expect(setAccent).toHaveBeenCalledWith('green');
    await waitFor(() => expect(patchProfile).toHaveBeenCalledWith({ accentColor: 'green' }));
  });

  it('sends the pending patch once when unmounted before the debounce elapses', () => {
    vi.useFakeTimers();
    const { patchProfile } = configure(
      'blue',
      { userId: 'u1' },
      vi.fn().mockResolvedValue(undefined)
    );

    const { unmount } = render(<AccentColorPicker />);
    fireEvent.click(green());
    expect(patchProfile).not.toHaveBeenCalled();

    unmount();
    vi.advanceTimersByTime(1000);

    expect(patchProfile).toHaveBeenCalledExactlyOnceWith({ accentColor: 'green' });
  });

  it('sends nothing on unmount once the debounced patch has gone out', () => {
    vi.useFakeTimers();
    const { patchProfile } = configure(
      'blue',
      { userId: 'u1' },
      vi.fn().mockResolvedValue(undefined)
    );

    const { unmount } = render(<AccentColorPicker />);
    fireEvent.click(green());
    vi.advanceTimersByTime(1000);
    unmount();

    expect(patchProfile).toHaveBeenCalledTimes(1);
  });

  it('rolls back the accent when the patch fails', async () => {
    configure('blue', { userId: 'u1' }, vi.fn().mockRejectedValue(new Error('nope')));

    render(<AccentColorPicker />);
    await userEvent.click(green());

    await waitFor(() => expect(setAccent).toHaveBeenCalledWith('blue'));
  });

  it('shows an inline error when the patch fails', async () => {
    configure('blue', { userId: 'u1' }, vi.fn().mockRejectedValue(new Error('nope')));

    render(<AccentColorPicker />);
    await userEvent.click(green());

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('calls onSaved after a successful patch', async () => {
    const onSaved = vi.fn();
    configure('blue', { userId: 'u1' }, vi.fn().mockResolvedValue(undefined));

    render(<AccentColorPicker onSaved={onSaved} />);
    await userEvent.click(green());

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('is a choice group: only the current swatch is tabbable', () => {
    configure('blue');
    render(<AccentColorPicker />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: 'auth.account.accentColorOptions.blue' })
    ).toHaveAttribute('tabindex', '0');
    expect(green()).toHaveAttribute('tabindex', '-1');
  });

  it('moves to the next swatch with ArrowRight', () => {
    configure('blue');

    render(<AccentColorPicker />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'auth.account.accentColorOptions.blue' }), {
      key: 'ArrowRight',
    });

    expect(setAccent).toHaveBeenCalledWith('green');
  });
});
