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
  closeOnFocusLeave?: boolean;
};

function Popover({
  onClose,
  enabled = true,
  withPortal = false,
  ignoreSelector,
  returnFocus = false,
  closeOnFocusLeave = false,
}: Readonly<Omit<HarnessProps, 'insideDialog' | 'withOtherDialog'>>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useClickOutside(withPortal ? [rootRef, portalRef] : rootRef, onClose, enabled, {
    ignoreSelector,
    returnFocusTo: returnFocus ? triggerRef : undefined,
    closeOnFocusLeave,
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

  it('lets Escape close the popover opened last, not the one it opened from', () => {
    const outerClose = vi.fn();
    const innerClose = vi.fn();
    function Nested({ innerOpen }: Readonly<{ innerOpen: boolean }>) {
      const outerRef = useRef<HTMLDivElement>(null);
      const innerRef = useRef<HTMLDivElement>(null);
      useClickOutside(outerRef, outerClose, true);
      useClickOutside(innerRef, innerClose, innerOpen);
      return (
        <div ref={outerRef}>
          <div ref={innerRef}>
            <button type="button">in the inner popover</button>
          </div>
        </div>
      );
    }
    const { rerender } = render(<Nested innerOpen={false} />);
    rerender(<Nested innerOpen />);
    const inner = screen.getByRole('button', { name: 'in the inner popover' });
    inner.focus();

    fireEvent.keyDown(inner, { key: 'Escape' });
    expect(innerClose).toHaveBeenCalledTimes(1);
    expect(outerClose).not.toHaveBeenCalled();

    rerender(<Nested innerOpen={false} />);
    fireEvent.keyDown(inner, { key: 'Escape' });
    expect(outerClose).toHaveBeenCalledTimes(1);
  });

  it('leaves an Escape already handled by the widget alone', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const inside = screen.getByRole('button', { name: 'inside' });
    inside.addEventListener('keydown', (event) => event.preventDefault());

    fireEvent.keyDown(inside, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes once the focus lands outside, and leaves it where it landed', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} closeOnFocusLeave returnFocus />);
    const inside = screen.getByRole('button', { name: 'inside' });
    inside.focus();
    expect(onClose).not.toHaveBeenCalled();

    const outside = screen.getByRole('button', { name: 'outside' });
    outside.focus();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(outside).toHaveFocus();
  });

  it('keeps a portaled panel open while the focus moves into it', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} closeOnFocusLeave withPortal />);

    screen.getByRole('button', { name: 'portaled' }).focus();

    expect(onClose).not.toHaveBeenCalled();
  });

  it('stays open when the focus moves to a dialog opened over it', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} closeOnFocusLeave withOtherDialog />);

    screen.getByRole('button', { name: 'in another dialog' }).focus();

    expect(onClose).not.toHaveBeenCalled();
  });

  it('leaves the focus on the ignored selector alone', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} closeOnFocusLeave ignoreSelector="[data-toggle]" />);

    screen.getByRole('button', { name: 'toggle' }).focus();

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not watch the focus unless asked to', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    screen.getByRole('button', { name: 'outside' }).focus();

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
