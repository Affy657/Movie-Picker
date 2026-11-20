import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import clsx from 'clsx';
import { ZoomIn, ZoomOut } from 'lucide-react';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  centeredCrop,
  cropWindowRect,
  displayedSize,
  moveCrop,
  resizeCrop,
  zoomCrop,
  type Crop,
  type CropPoint,
  type ImageSize,
  type Rect,
} from '@/features/auth/utils/avatarPhotoCrop';
import type { LoadedAvatarPhoto } from '@/features/auth/utils/avatarPhotoFile';
import pickerStyles from './AvatarPickerModal.module.css';
import styles from './AvatarPhotoCropper.module.css';

const FALLBACK_FRAME = 320;
const FALLBACK_MASK_INSET = 12;
const LANDSCAPE_RATIO = 16 / 9;
const LANDSCAPE_MASK_INSET = 0.06;

export type CropShape = 'circle' | 'landscape';
const KEY_STEP = 8;
const KEY_STEP_LARGE = 32;
const KEY_ZOOM_STEP = 0.1;
const ZOOM_SLIDER_STEP = 0.01;

type Props = {
  photo: LoadedAvatarPhoto;
  saving: boolean;
  error: string | null;
  shape?: CropShape;
  hint?: string;
  areaLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (rect: Rect) => void;
};

function frameOf(width: number, shape: CropShape): ImageSize {
  return { width, height: shape === 'landscape' ? width / LANDSCAPE_RATIO : width };
}

function fallbackWindow(frame: ImageSize, shape: CropShape): Rect {
  if (shape === 'landscape') {
    const x = frame.width * LANDSCAPE_MASK_INSET;
    const y = frame.height * LANDSCAPE_MASK_INSET;
    return { x, y, width: frame.width - 2 * x, height: frame.height - 2 * y };
  }
  const side = frame.width - 2 * FALLBACK_MASK_INSET;
  return { x: FALLBACK_MASK_INSET, y: FALLBACK_MASK_INSET, width: side, height: side };
}

function measuredWindow(frameBox: DOMRect, maskBox: DOMRect | undefined): Rect | null {
  if (!maskBox || maskBox.width <= 0 || maskBox.width >= frameBox.width) return null;
  return {
    x: maskBox.left - frameBox.left,
    y: maskBox.top - frameBox.top,
    width: maskBox.width,
    height: maskBox.height,
  };
}

function distance(a: CropPoint, b: CropPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function tryCapturePointer(element: HTMLElement, pointerId: number): boolean {
  try {
    element.setPointerCapture?.(pointerId);
    return true;
  } catch {
    return false;
  }
}

export default function AvatarPhotoCropper({
  photo,
  saving,
  error,
  shape = 'circle',
  hint,
  areaLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const hintId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLSpanElement>(null);
  const pointers = useRef(new Map<number, CropPoint>());
  const pinchDistance = useRef<number | null>(null);
  const measuredFrame = useRef<number | null>(null);
  const [frame, setFrame] = useState<ImageSize>(() => frameOf(FALLBACK_FRAME, shape));
  const [cropWindow, setCropWindow] = useState<Rect>(() =>
    fallbackWindow(frameOf(FALLBACK_FRAME, shape), shape)
  );
  const [crop, setCrop] = useState<Crop>(() => centeredCrop(photo, frameOf(FALLBACK_FRAME, shape)));

  useEffect(() => {
    frameRef.current?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    measuredFrame.current = null;

    function measure(frameElement: HTMLElement) {
      const frameBox = frameElement.getBoundingClientRect();
      const frameWidth = frameBox.width;
      const previous = measuredFrame.current;
      if (frameWidth <= 0 || frameWidth === previous) return;
      const nextFrame = frameOf(frameWidth, shape);
      measuredFrame.current = frameWidth;
      setFrame(nextFrame);
      setCropWindow(
        measuredWindow(frameBox, maskRef.current?.getBoundingClientRect()) ??
          fallbackWindow(nextFrame, shape)
      );
      setCrop((current) =>
        previous === null
          ? centeredCrop(photo, nextFrame)
          : resizeCrop(current, photo, frameOf(previous, shape), nextFrame)
      );
    }

    measure(element);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure(element));
    observer.observe(element);
    return () => observer.disconnect();
  }, [photo, shape]);

  const shown = displayedSize(photo, frame, crop.zoom);

  function pointInFrame(point: CropPoint): CropPoint {
    const box = frameRef.current?.getBoundingClientRect();
    return box ? { x: point.x - box.left, y: point.y - box.top } : point;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const [first, second] = [...pointers.current.values()];
    pinchDistance.current = first && second ? distance(first, second) : null;
    tryCapturePointer(event.currentTarget, event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      handlePointerEnd(event);
      return;
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const [first, second] = [...pointers.current.values()];
    if (first && second) {
      const nextDistance = distance(first, second);
      const startDistance = pinchDistance.current ?? nextDistance;
      pinchDistance.current = nextDistance;
      const middle = pointInFrame({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });
      setCrop((current) =>
        zoomCrop(current, (current.zoom * nextDistance) / startDistance, photo, frame, middle)
      );
      return;
    }
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    setCrop((current) => moveCrop(current, dx, dy, photo, frame));
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    pinchDistance.current = null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setCrop((current) => moveCrop(current, move[0], move[1], photo, frame));
      return;
    }
    if (event.key === '+' || event.key === '=' || event.key === '-') {
      event.preventDefault();
      const delta = event.key === '-' ? -KEY_ZOOM_STEP : KEY_ZOOM_STEP;
      setCrop((current) => zoomCrop(current, current.zoom + delta, photo, frame));
    }
  }

  return (
    <div className={styles.step}>
      <p className={pickerStyles.hint}>{hint ?? t('auth.account.avatarPhotoCropHint')}</p>
      <div
        ref={frameRef}
        role="toolbar"
        aria-label={areaLabel ?? t('auth.account.avatarPhotoCropAreaLabel')}
        aria-describedby={hintId}
        tabIndex={0}
        className={clsx(styles.frame, shape === 'landscape' && styles.frameLandscape)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={handleKeyDown}
      >
        <img
          src={photo.url}
          alt=""
          draggable={false}
          data-testid="avatar-photo-crop-image"
          className={styles.image}
          style={{
            width: shown.width,
            height: shown.height,
            transform: `translate3d(${crop.x}px, ${crop.y}px, 0)`,
          }}
        />
        {shape === 'circle' && <span className={styles.shade} aria-hidden="true" />}
        <span
          ref={maskRef}
          className={shape === 'landscape' ? styles.maskLandscape : styles.mask}
          aria-hidden="true"
        />
      </div>
      <span id={hintId} className="visually-hidden">
        {t('auth.account.avatarPhotoCropKeyboardHint')}
      </span>
      <div className={clsx(styles.zoom, shape === 'landscape' && styles.zoomLandscape)}>
        <ZoomOut size={ICON_SIZE.xl} aria-hidden />
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={ZOOM_SLIDER_STEP}
          value={crop.zoom}
          aria-label={t('auth.account.avatarPhotoZoom')}
          className={styles.slider}
          onChange={(event) => {
            const zoom = Number(event.target.value);
            setCrop((current) => zoomCrop(current, zoom, photo, frame));
          }}
        />
        <ZoomIn size={ICON_SIZE.xl} aria-hidden />
      </div>
      {error && (
        <p role="alert" className={pickerStyles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          loading={saving}
          onClick={() => onConfirm(cropWindowRect(crop, photo, frame, cropWindow))}
        >
          {confirmLabel ?? t('auth.account.avatarPhotoUse')}
        </Button>
      </div>
    </div>
  );
}
