import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEventActions } from './useEventActions';
import { ApiError } from '@/api/client';

jest.mock('@/api/events', () => ({
  removeParticipant: jest.fn(async () => undefined),
}));

const api = require('@/api/events') as { removeParticipant: jest.Mock };

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { Wrapper, client };
}

beforeEach(() => {
  api.removeParticipant.mockReset();
  api.removeParticipant.mockResolvedValue(undefined);
});

describe('useEventActions', () => {
  it('calls removeParticipant with idOrSlug and participantId', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEventActions('soiree-1'), { wrapper: Wrapper });

    act(() => result.current.kickParticipant('p42'));

    await waitFor(() => expect(api.removeParticipant).toHaveBeenCalledTimes(1));
    expect(api.removeParticipant).toHaveBeenCalledWith('soiree-1', 'p42');
  });

  it('exposes ApiError message on failure', async () => {
    api.removeParticipant.mockRejectedValueOnce(new ApiError(403, 'Interdit'));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEventActions('soiree-1'), { wrapper: Wrapper });

    act(() => result.current.kickParticipant('p42'));

    await waitFor(() => expect(result.current.error).toBe('Interdit'));
  });

  it('falls back to a generic error message for non-ApiError', async () => {
    api.removeParticipant.mockRejectedValueOnce(new Error('boom'));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEventActions('soiree-1'), { wrapper: Wrapper });

    act(() => result.current.kickParticipant('p42'));

    await waitFor(() => expect(result.current.error).toBe('Retrait impossible.'));
  });

  it('clearError resets the error to null', async () => {
    api.removeParticipant.mockRejectedValueOnce(new ApiError(403, 'Interdit'));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEventActions('soiree-1'), { wrapper: Wrapper });

    act(() => result.current.kickParticipant('p42'));
    await waitFor(() => expect(result.current.error).toBe('Interdit'));

    act(() => result.current.clearError());
    await waitFor(() => expect(result.current.error).toBeNull());
  });
});
