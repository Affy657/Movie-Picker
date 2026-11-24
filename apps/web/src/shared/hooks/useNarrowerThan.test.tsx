import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useNarrowerThan } from './useNarrowerThan';

type Callback = (entries: { contentRect: { width: number } }[]) => void;

let notify: Callback = () => {};
const disconnect = vi.fn();

function stubResizeObserver() {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: Callback) {
        notify = callback;
      }
      observe() {}
      disconnect = disconnect;
    }
  );
}

function Probe() {
  const { ref, narrow } = useNarrowerThan<HTMLDivElement>(300);
  return (
    <div ref={ref} data-testid="probe">
      {narrow ? 'narrow' : 'wide'}
    </div>
  );
}

describe('useNarrowerThan', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports whether the element is narrower than the threshold', () => {
    stubResizeObserver();
    const { unmount } = render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('wide');

    act(() => notify([{ contentRect: { width: 280 } }]));
    expect(screen.getByTestId('probe')).toHaveTextContent('narrow');

    act(() => notify([{ contentRect: { width: 340 } }]));
    expect(screen.getByTestId('probe')).toHaveTextContent('wide');

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('stays wide where ResizeObserver does not exist', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('wide');
  });
});
