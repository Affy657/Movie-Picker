import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEffect, useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useSheetDrag } from '@/shared/hooks/useSheetDrag';

const DRAG_START_MS = 1_000;

function stubMatchMedia(matchesFor: (query: string) => boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: matchesFor(query),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

function drag(
  target: HTMLElement,
  { fromY, toY, durationMs }: { fromY: number; toY: number; durationMs: number }
) {
  const now = vi.spyOn(performance, 'now').mockReturnValue(DRAG_START_MS);
  fireEvent.pointerDown(target, { pointerId: 1, button: 0, clientY: fromY });
  now.mockReturnValue(DRAG_START_MS + durationMs);
  fireEvent.pointerMove(window, { pointerId: 1, clientY: toY });
  fireEvent.pointerUp(window, { pointerId: 1, clientY: toY });
}

function DragHarness({
  onClose,
  enabled = true,
}: Readonly<{ onClose: () => void; enabled?: boolean }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bind = useSheetDrag(dialogRef, onClose, enabled);

  useEffect(() => {
    dialogRef.current?.showModal();
    const dialog = dialogRef.current;
    if (!dialog) return;
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      height: 400,
      width: 300,
      top: 200,
      left: 0,
      right: 300,
      bottom: 600,
      x: 0,
      y: 200,
      toJSON: () => ({}),
    });
  }, []);

  return (
    <dialog ref={dialogRef}>
      <div data-testid="drag-zone" {...bind}>
        poignée
        <button type="button" onClick={onClose}>
          fermer
        </button>
      </div>
    </dialog>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useSheetDrag', () => {
  it('closes the sheet after a long slow drag', () => {
    stubMatchMedia(
      (query) => query.includes('max-width') || query.includes('prefers-reduced-motion')
    );
    const onClose = vi.fn();
    render(<DragHarness onClose={onClose} />);

    drag(screen.getByTestId('drag-zone'), { fromY: 80, toY: 240, durationMs: 400 });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the sheet open after a short slow drag', () => {
    stubMatchMedia(
      (query) => query.includes('max-width') || query.includes('prefers-reduced-motion')
    );
    const onClose = vi.fn();
    render(<DragHarness onClose={onClose} />);

    drag(screen.getByTestId('drag-zone'), { fromY: 80, toY: 90, durationMs: 200 });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes the sheet after a short fast flick', () => {
    stubMatchMedia(
      (query) => query.includes('max-width') || query.includes('prefers-reduced-motion')
    );
    const onClose = vi.fn();
    render(<DragHarness onClose={onClose} />);

    drag(screen.getByTestId('drag-zone'), { fromY: 80, toY: 120, durationMs: 16 });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not drag outside the mobile viewport', () => {
    stubMatchMedia(() => false);
    const onClose = vi.fn();
    render(<DragHarness onClose={onClose} />);

    drag(screen.getByTestId('drag-zone'), { fromY: 80, toY: 300, durationMs: 400 });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores a pointerdown on a button', () => {
    stubMatchMedia(
      (query) => query.includes('max-width') || query.includes('prefers-reduced-motion')
    );
    const onClose = vi.fn();
    render(<DragHarness onClose={onClose} />);

    drag(screen.getByRole('button', { name: 'fermer' }), {
      fromY: 80,
      toY: 300,
      durationMs: 400,
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});
