import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

const SHEET_VIEWPORT_QUERY = '(max-width: 767px)';
const REDUCE_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const DISMISS_RATIO = 0.28;
const DISMISS_VELOCITY_PX_MS = 1.05;
const RUBBER = 0.12;
const SETTLE_MS = 320;
const EASE_OUT_QUINT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const INTERACTIVE_SELECTOR = 'button, a, input, textarea, select, [role="menuitem"]';

function isSheetViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(SHEET_VIEWPORT_QUERY).matches;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(REDUCE_MOTION_QUERY).matches;
}

function isFromInteractive(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest(INTERACTIVE_SELECTOR);
}

function sheetHeight(dialog: HTMLDialogElement): number {
  const measured = dialog.getBoundingClientRect().height;
  return measured > 0 ? measured : 480;
}

function clearDragStyles(dialog: HTMLDialogElement): void {
  dialog.style.transform = '';
  dialog.style.transition = '';
  dialog.style.removeProperty('--sheet-drag-progress');
  delete dialog.dataset.sheetDragging;
  delete dialog.dataset.sheetSettling;
}

export type SheetDragBind = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
};

export function useSheetDrag(
  dialogRef: RefObject<HTMLDialogElement | null>,
  onClose: () => void,
  enabled: boolean
): SheetDragBind {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const dragRef = useRef({
    pointerId: -1,
    startY: 0,
    lastY: 0,
    lastT: 0,
    velocity: 0,
    active: false,
  });

  const settleTimerRef = useRef<number | null>(null);
  const listenersRef = useRef<{
    move: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void;
  } | null>(null);

  const cancelSettle = useCallback(() => {
    if (settleTimerRef.current != null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const detachListeners = useCallback(() => {
    if (!listenersRef.current) return;
    window.removeEventListener('pointermove', listenersRef.current.move);
    window.removeEventListener('pointerup', listenersRef.current.up);
    window.removeEventListener('pointercancel', listenersRef.current.up);
    listenersRef.current = null;
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      cancelSettle();
      detachListeners();
      if (dialog) clearDragStyles(dialog);
    };
  }, [cancelSettle, detachListeners, dialogRef]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || !isSheetViewport()) return;
      if (event.button !== 0) return;
      if (isFromInteractive(event.target)) return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      cancelSettle();
      detachListeners();
      clearDragStyles(dialog);

      const now = performance.now();
      dragRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        lastY: event.clientY,
        lastT: now,
        velocity: 0,
        active: true,
      };

      dialog.dataset.sheetDragging = '';
      event.currentTarget.setPointerCapture?.(event.pointerId);

      const applyOffset = (clientY: number) => {
        const raw = clientY - dragRef.current.startY;
        const visual = raw < 0 ? raw * RUBBER : raw;
        const height = sheetHeight(dialog);
        const progress = Math.min(1, Math.max(0, visual / height));
        dialog.style.transform = `translateY(${visual}px)`;
        dialog.style.setProperty('--sheet-drag-progress', String(progress));
        return { offset: Math.max(0, visual), height };
      };

      const onMove = (moveEvent: PointerEvent) => {
        if (!dragRef.current.active || moveEvent.pointerId !== dragRef.current.pointerId) return;
        const nowMove = performance.now();
        const dt = nowMove - dragRef.current.lastT;
        if (dt >= 8) {
          dragRef.current.velocity = (moveEvent.clientY - dragRef.current.lastY) / dt;
        }
        dragRef.current.lastY = moveEvent.clientY;
        dragRef.current.lastT = nowMove;
        applyOffset(moveEvent.clientY);
      };

      const finishSettle = (dismiss: boolean) => {
        cancelSettle();
        const current = dialogRef.current;
        if (current) clearDragStyles(current);
        if (dismiss) onCloseRef.current();
      };

      const settle = (dismiss: boolean, height: number) => {
        dragRef.current.active = false;
        detachListeners();

        if (prefersReducedMotion()) {
          finishSettle(dismiss);
          return;
        }

        dialog.dataset.sheetSettling = '';
        delete dialog.dataset.sheetDragging;
        dialog.style.transition = `transform ${SETTLE_MS / 1000}s ${EASE_OUT_QUINT}`;
        if (dismiss) {
          dialog.style.transform = `translateY(${height}px)`;
          dialog.style.setProperty('--sheet-drag-progress', '1');
        } else {
          dialog.style.transform = 'translateY(0)';
          dialog.style.setProperty('--sheet-drag-progress', '0');
        }

        const onTransitionEnd = (te: TransitionEvent) => {
          if (te.target !== dialog || (te.propertyName && te.propertyName !== 'transform')) return;
          dialog.removeEventListener('transitionend', onTransitionEnd);
          finishSettle(dismiss);
        };
        dialog.addEventListener('transitionend', onTransitionEnd);
        settleTimerRef.current = window.setTimeout(() => {
          dialog.removeEventListener('transitionend', onTransitionEnd);
          finishSettle(dismiss);
        }, SETTLE_MS + 40);
      };

      const onUp = (upEvent: PointerEvent) => {
        if (!dragRef.current.active || upEvent.pointerId !== dragRef.current.pointerId) return;
        const { offset, height } = applyOffset(upEvent.clientY);
        if (offset < 8 && dragRef.current.velocity <= DISMISS_VELOCITY_PX_MS) {
          settle(false, height);
          return;
        }
        const dismiss =
          offset > height * DISMISS_RATIO || dragRef.current.velocity > DISMISS_VELOCITY_PX_MS;
        settle(dismiss, height);
      };

      listenersRef.current = { move: onMove, up: onUp };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [cancelSettle, detachListeners, dialogRef, enabled]
  );

  return { onPointerDown };
}
