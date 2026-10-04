import { describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';

type HarnessProps = {
  onClose: () => void;
  enabled?: boolean;
  insideDialog?: boolean;
  withOtherDialog?: boolean;
  withPortal?: boolean;
  ignoreSelector?: string;
  returnFocus?: boolean;
};

function Popover({
  onClose,
  enabled = true,
  withPortal = false,
  ignoreSelector,
  returnFocus = false,
}: Readonly<Omit<HarnessProps, 'insideDialog' | 'withOtherDialog'>>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useClickOutside(withPortal ? [rootRef, portalRef] : rootRef, onClose, enabled, {
    ignoreSelector,
    returnFocusTo: returnFocus ? triggerRef : undefined,
  });
  return (
    <>
      <button type="button" ref={triggerRef}>
        trigger
      </button>
      <div ref={rootRef}>
        <button type="button">inside</button>
      </div>
      {withPortal &&
        createPortal(
          <div ref={portalRef}>
            <button type="button">portaled</button>
          </div>,
          document.body
        )}
    </>
  );
}

function Harness({
  insideDialog = false,
  withOtherDialog = false,
  ...props
}: Readonly<HarnessProps>) {
  const popover = <Popover {...props} />;
  return (
    <>
      {insideDialog ? (
        <dialog open aria-label="sheet">
          {popover}
          <button type="button">elsewhere in the sheet</button>
        </dialog>
      ) : (
        popover
      )}
      <button type="button" data-toggle>
        toggle
      </button>
      {withOtherDialog && (
        <dialog open aria-label="other dialog">
          <button type="button">in another dialog</button>
        </dialog>
      )}
      <button type="button">outside</button>
    </>
  );
}

describe('useClickOutside', () => {
  it('closes on a press outside and not on a press inside', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'inside' }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('treats every listed element as inside, a portaled panel included', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} withPortal />);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'portaled' }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('leaves presses on the ignored selector alone', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} ignoreSelector="[data-toggle]" />);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'toggle' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores a press in a dialog opened over it', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} withOtherDialog />);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'in another dialog' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on a press elsewhere in the dialog that holds it', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} insideDialog withOtherDialog />);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'elsewhere in the sheet' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'in another dialog' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape, gives the focus back and keeps the enclosing dialog open', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} insideDialog returnFocus />);
    const inside = screen.getByRole('button', { name: 'inside' });
    inside.focus();

    const notCancelled = fireEvent.keyDown(inside, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'trigger' })).toHaveFocus();
    expect(notCancelled).toBe(false);
  });

  it('lets Escape pressed in a dialog opened over it close that dialog only', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} withOtherDialog />);

    const notCancelled = fireEvent.keyDown(
      screen.getByRole('button', { name: 'in another dialog' }),
      { key: 'Escape' }
    );

    expect(onClose).not.toHaveBeenCalled();
    expect(notCancelled).toBe(true);
  });

  it('leaves Escape to a dialog opened over it when the focus fell back to the page', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} withOtherDialog />);

    const notCancelled = fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
    expect(notCancelled).toBe(true);
  });

  it('closes on Escape without pulling back a focus that already left the popover', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} returnFocus />);
    const outside = screen.getByRole('button', { name: 'outside' });
    outside.focus();

    fireEvent.keyDown(outside, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(outside).toHaveFocus();
  });

  it('leaves an Escape already handled by the widget alone', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const inside = screen.getByRole('button', { name: 'inside' });
    inside.addEventListener('keydown', (event) => event.preventDefault());

    fireEvent.keyDown(inside, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does nothing while disabled', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} enabled={false} />);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));
    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});
