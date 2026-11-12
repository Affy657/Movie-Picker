import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import {
  readHistoryEntryValue,
  useHistoryEntryState,
  writeHistoryEntryValue,
} from '@/shared/hooks/useHistoryEntryState';

function routerAt(key: string) {
  return function RouterAt({ children }: Readonly<{ children: ReactNode }>) {
    return <MemoryRouter initialEntries={[{ pathname: '/liste', key }]}>{children}</MemoryRouter>;
  };
}

function Counter() {
  const [count, setCount] = useHistoryEntryState('count', 0);
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="count">{count}</output>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Plus
      </button>
      <button type="button" onClick={() => navigate('/film/1')}>
        Ouvrir
      </button>
    </>
  );
}

function FilmPage() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate(-1)}>
        Retour
      </button>
      <button type="button" onClick={() => navigate('/liste')}>
        Liste
      </button>
    </>
  );
}

function renderList() {
  return render(
    <MemoryRouter initialEntries={['/liste']}>
      <Routes>
        <Route path="/liste" element={<Counter />} />
        <Route path="/film/:id" element={<FilmPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('useHistoryEntryState', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('starts from the initial value on an entry never visited', () => {
    const { result } = renderHook(() => useHistoryEntryState('count', 3), {
      wrapper: routerAt('fresh'),
    });

    expect(result.current[0]).toBe(3);
  });

  it('gives the value back when the same entry is mounted again', () => {
    const first = renderHook(() => useHistoryEntryState('count', 0), {
      wrapper: routerAt('list-entry'),
    });
    act(() => first.result.current[1](5));
    first.unmount();

    const second = renderHook(() => useHistoryEntryState('count', 0), {
      wrapper: routerAt('list-entry'),
    });

    expect(second.result.current[0]).toBe(5);
  });

  it('keeps each entry and each name apart', () => {
    const first = renderHook(() => useHistoryEntryState('count', 0), {
      wrapper: routerAt('entry-a'),
    });
    act(() => first.result.current[1](5));
    first.unmount();

    const otherEntry = renderHook(() => useHistoryEntryState('count', 0), {
      wrapper: routerAt('entry-b'),
    });
    const otherName = renderHook(() => useHistoryEntryState('other', 0), {
      wrapper: routerAt('entry-a'),
    });

    expect(otherEntry.result.current[0]).toBe(0);
    expect(otherName.result.current[0]).toBe(0);
  });

  it('restores the value when Back comes to the entry after a navigation unmounted it', async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole('button', { name: 'Plus' }));
    await user.click(screen.getByRole('button', { name: 'Plus' }));
    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await user.click(screen.getByRole('button', { name: 'Retour' }));

    expect(screen.getByTestId('count')).toHaveTextContent('2');
  });

  it('starts over when a link opens the same page as a new entry', async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole('button', { name: 'Plus' }));
    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await user.click(screen.getByRole('button', { name: 'Liste' }));

    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('ignores a stored value that no longer has the shape of the initial value', () => {
    writeHistoryEntryValue('stale', 'sort', { by: 'title' });

    const { result } = renderHook(
      () => useHistoryEntryState('sort', { by: 'primary', dir: 'desc' }),
      { wrapper: routerAt('stale') }
    );

    expect(result.current[0]).toEqual({ by: 'primary', dir: 'desc' });
  });

  it('accepts a stored value the caller vouches for', () => {
    writeHistoryEntryValue('picked', 'pick', { title: 'Alien' });
    const isPick = (value: unknown): value is { title: string } | null =>
      value === null || typeof (value as { title?: unknown }).title === 'string';

    const { result } = renderHook(
      () => useHistoryEntryState<{ title: string } | null>('pick', null, isPick),
      { wrapper: routerAt('picked') }
    );

    expect(result.current[0]).toEqual({ title: 'Alien' });
  });

  it('works as plain state when the storage refuses to be read or written', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    const { result } = renderHook(() => useHistoryEntryState('count', 1), {
      wrapper: routerAt('blocked'),
    });
    act(() => result.current[1](4));

    expect(result.current[0]).toBe(4);
    expect(readHistoryEntryValue('blocked', 'count')).toBeUndefined();
  });
});

describe('the first entry of a document', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function loadWithNavigationType(type: NavigationTimingType) {
    vi.stubGlobal('performance', {
      ...performance,
      now: () => 0,
      getEntriesByType: (entryType: string) => (entryType === 'navigation' ? [{ type }] : []),
    });
    vi.resetModules();
    return import('@/shared/hooks/useHistoryEntryState');
  }

  it('forgets what a previous document left on the router first entry after a fresh navigation', async () => {
    sessionStorage.setItem('mp.history-entry:default:count', '5');
    sessionStorage.setItem('mp.history-entry:k3v9:count', '2');

    const storage = await loadWithNavigationType('navigate');

    expect(storage.readHistoryEntryValue('default', 'count')).toBeUndefined();
    expect(storage.readHistoryEntryValue('k3v9', 'count')).toBe(2);
  });

  it('keeps the first entry of the document after a reload', async () => {
    sessionStorage.setItem('mp.history-entry:default:count', '5');

    const storage = await loadWithNavigationType('reload');

    expect(storage.readHistoryEntryValue('default', 'count')).toBe(5);
  });

  it('keeps what this document wrote on its first entry', async () => {
    const storage = await loadWithNavigationType('navigate');

    storage.writeHistoryEntryValue('default', 'count', 7);

    expect(storage.readHistoryEntryValue('default', 'count')).toBe(7);
  });
});
