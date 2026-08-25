import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEffect, useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useSheetDrag } from '@/shared/hooks/useSheetDrag';

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
  vi.unstubAllGlobals();
});

describe('useSheetDrag', () => {
  it('ferme la feuille après un glissement vers le bas suffisant', () => {
    stubMatchMedia(
      (query) => query.includes('max-width') || query.includes('prefers-reduced-motion')
    );
    const onClose = vi.fn();
    render(<DragHarness onClose={onClose} />);

    const zone = screen.getByTestId('drag-zone');
    fireEvent.pointerDown(zone, { pointerId: 1, button: 0, clientY: 80 });
    fireEvent.pointerMove(window, { pointerId: 1, clientY: 240 });
    fireEvent.pointerUp(window, { pointerId: 1, clientY: 240 });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ne ferme pas si le glissement est trop court', () => {
    stubMatchMedia(
      (query) => query.includes('max-width') || query.includes('prefers-reduced-motion')
    );
    const onClose = vi.fn();
    render(<DragHarness onClose={onClose} />);

    const zone = screen.getByTestId('drag-zone');
    fireEvent.pointerDown(zone, { pointerId: 1, button: 0, clientY: 80 });
    fireEvent.pointerMove(window, { pointerId: 1, clientY: 90 });
    fireEvent.pointerUp(window, { pointerId: 1, clientY: 90 });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('n’active pas le drag hors viewport mobile', () => {
    stubMatchMedia(() => false);
    const onClose = vi.fn();
    render(<DragHarness onClose={onClose} />);

    const zone = screen.getByTestId('drag-zone');
    fireEvent.pointerDown(zone, { pointerId: 1, button: 0, clientY: 80 });
    fireEvent.pointerMove(window, { pointerId: 1, clientY: 300 });
    fireEvent.pointerUp(window, { pointerId: 1, clientY: 300 });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignore un pointerdown sur un bouton', () => {
    stubMatchMedia(
      (query) => query.includes('max-width') || query.includes('prefers-reduced-motion')
    );
    const onClose = vi.fn();
    render(<DragHarness onClose={onClose} />);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'fermer' }), {
      pointerId: 1,
      button: 0,
      clientY: 80,
    });
    fireEvent.pointerMove(window, { pointerId: 1, clientY: 300 });
    fireEvent.pointerUp(window, { pointerId: 1, clientY: 300 });

    expect(onClose).not.toHaveBeenCalled();
  });
});
