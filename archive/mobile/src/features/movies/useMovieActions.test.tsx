import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMovieActions } from './useMovieActions';

jest.mock('@/api/movies', () => ({
  vote: jest.fn(async () => undefined),
  cancelVote: jest.fn(async () => undefined),
  markSeen: jest.fn(async () => undefined),
  unmarkSeen: jest.fn(async () => undefined),
  removeMovie: jest.fn(async () => undefined),
}));

jest.mock('@/lib/toast', () => ({
  toastSuccess: jest.fn(),
  toastError: jest.fn(),
}));

const api = require('@/api/movies') as {
  vote: jest.Mock;
  cancelVote: jest.Mock;
  markSeen: jest.Mock;
  unmarkSeen: jest.Mock;
  removeMovie: jest.Mock;
};
const toast = require('@/lib/toast') as { toastSuccess: jest.Mock };

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
  api.vote.mockClear();
  api.cancelVote.mockClear();
  api.markSeen.mockClear();
  api.unmarkSeen.mockClear();
  api.removeMovie.mockClear();
  toast.toastSuccess.mockClear();
});

describe('useMovieActions', () => {
  it('calls apiVote with participantId and value when vote(+1)', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieActions('slug-1', 'p1'), { wrapper: Wrapper });

    act(() => result.current.vote('m1', 1));

    await waitFor(() => expect(api.vote).toHaveBeenCalledTimes(1));
    expect(api.vote).toHaveBeenCalledWith('slug-1', 'm1', { participantId: 'p1', value: 1 });
    expect(api.cancelVote).not.toHaveBeenCalled();
  });

  it('calls cancelVote when value is null', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieActions('slug-1', 'p1'), { wrapper: Wrapper });

    act(() => result.current.vote('m1', null));

    await waitFor(() => expect(api.cancelVote).toHaveBeenCalledTimes(1));
    expect(api.cancelVote).toHaveBeenCalledWith('slug-1', 'm1', 'p1');
    expect(api.vote).not.toHaveBeenCalled();
  });

  it('exposes an error when participantId is missing', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieActions('slug-1', null), { wrapper: Wrapper });

    act(() => result.current.vote('m1', 1));

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(api.vote).not.toHaveBeenCalled();
  });

  it('calls markSeen when toggling from not seen', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieActions('slug-1', 'p1'), { wrapper: Wrapper });

    act(() => result.current.toggleSeen('m1', false));

    await waitFor(() => expect(api.markSeen).toHaveBeenCalledTimes(1));
    expect(api.markSeen).toHaveBeenCalledWith('slug-1', 'm1', { participantId: 'p1' });
  });

  it('calls unmarkSeen when toggling from seen', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieActions('slug-1', 'p1'), { wrapper: Wrapper });

    act(() => result.current.toggleSeen('m1', true));

    await waitFor(() => expect(api.unmarkSeen).toHaveBeenCalledTimes(1));
    expect(api.unmarkSeen).toHaveBeenCalledWith('slug-1', 'm1', 'p1');
  });

  it('calls removeMovie and shows a success toast on remove', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieActions('slug-1', 'p1'), { wrapper: Wrapper });

    act(() => result.current.remove('m1'));

    await waitFor(() => expect(api.removeMovie).toHaveBeenCalledTimes(1));
    expect(api.removeMovie).toHaveBeenCalledWith('slug-1', 'm1');
    expect(toast.toastSuccess).toHaveBeenCalled();
  });

  it('clearError resets the error to null', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieActions('slug-1', null), { wrapper: Wrapper });

    act(() => result.current.vote('m1', 1));
    await waitFor(() => expect(result.current.error).toBeTruthy());

    act(() => result.current.clearError());
    await waitFor(() => expect(result.current.error).toBeNull());
  });
});
