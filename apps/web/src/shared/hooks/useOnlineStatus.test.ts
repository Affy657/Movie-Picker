import { act, renderHook } from '@testing-library/react';
import { onlineManager } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';

describe('useOnlineStatus', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it('follows the network status known to React Query', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => onlineManager.setOnline(false));
    expect(result.current).toBe(false);

    act(() => onlineManager.setOnline(true));
    expect(result.current).toBe(true);
  });
});
