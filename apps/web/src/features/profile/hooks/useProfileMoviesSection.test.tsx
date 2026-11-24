import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProfileMoviesSection } from './useProfileMoviesSection';

const moduleLoads = vi.hoisted(() => ({ count: 0 }));

vi.mock('@/features/profile/components/ProfileMoviesSection', () => {
  moduleLoads.count += 1;
  return { default: () => null };
});

describe('useProfileMoviesSection', () => {
  it('loads the films section once the profile has answered, not before', async () => {
    const { result, rerender } = renderHook(
      ({ profileLoaded }) => useProfileMoviesSection(profileLoaded),
      { initialProps: { profileLoaded: false } }
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current).toBeNull();
    expect(moduleLoads.count).toBe(0);

    rerender({ profileLoaded: true });

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(moduleLoads.count).toBe(1);
  });
});
