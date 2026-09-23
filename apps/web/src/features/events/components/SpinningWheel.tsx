import { useEffect, useRef } from 'react';
import type { MovieData } from '@/shared/types/movie';
import { WHEEL_SPIN_DURATION_MS } from '@/shared/utils/wheelSpin';
import { randomCenteredUnit } from '@/shared/utils/random';
import { readCssToken } from '@/shared/utils/cssToken';
import styles from './SpinningWheel.module.css';

const SIZE = 460;
const RADIUS = 200;
const SPIN_ROTATIONS = 8;

export const WHEEL_SEGMENT_TOKENS = [
  '--color-wheel-0',
  '--color-wheel-1',
  '--color-wheel-2',
  '--color-wheel-3',
  '--color-wheel-4',
  '--color-wheel-5',
  '--color-wheel-6',
  '--color-wheel-7',
  '--color-wheel-8',
  '--color-wheel-9',
  '--color-wheel-10',
  '--color-wheel-11',
] as const;

type WheelPalette = Readonly<{
  segments: readonly string[];
  label: string;
  labelShadow: string;
  divider: string;
  hub: string;
  hubStroke: string;
  hubShadow: string;
  pointer: string;
  pointerStroke: string;
  pointerShadow: string;
  fontFamily: string;
}>;

function readWheelPalette(element: Element): WheelPalette {
  return {
    segments: WHEEL_SEGMENT_TOKENS.map((token) => readCssToken(token, element)),
    label: readCssToken('--color-wheel-label', element),
    labelShadow: readCssToken('--color-wheel-label-shadow', element),
    divider: readCssToken('--color-wheel-divider', element),
    hub: readCssToken('--color-wheel-hub', element),
    hubStroke: readCssToken('--color-wheel-hub-stroke', element),
    hubShadow: readCssToken('--color-wheel-hub-shadow', element),
    pointer: readCssToken('--color-wheel-pointer', element),
    pointerStroke: readCssToken('--color-wheel-pointer-stroke', element),
    pointerShadow: readCssToken('--color-wheel-pointer-shadow', element),
    fontFamily: readCssToken('--font-body', element),
  };
}

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

const LABEL_OUTER = RADIUS - 12;
const LABEL_INNER = 26;
const TEXT_MAX_W = LABEL_OUTER - LABEL_INNER;
const LABEL_MID_RADIUS = (LABEL_OUTER + LABEL_INNER) / 2;
const MAX_FONT = 18;
const MIN_FONT = 10;

function setFont(ctx: CanvasRenderingContext2D, size: number, fontFamily: string): void {
  ctx.font = `700 ${size}px ${fontFamily}`;
}

function applyFittedFont(
  ctx: CanvasRenderingContext2D,
  title: string,
  maxFont: number,
  fontFamily: string
): void {
  let size = maxFont;
  setFont(ctx, size, fontFamily);
  while (size > MIN_FONT && ctx.measureText(title).width > TEXT_MAX_W) {
    size--;
    setFont(ctx, size, fontFamily);
  }
}

function truncateToWidth(ctx: CanvasRenderingContext2D, title: string): string {
  if (ctx.measureText(title).width <= TEXT_MAX_W) return title;

  const words = title.split(' ').filter(Boolean);
  if (words.length > 1) {
    let kept = words.slice(0, -1);
    while (kept.length > 1 && ctx.measureText(`${kept.join(' ')}…`).width > TEXT_MAX_W) {
      kept = kept.slice(0, -1);
    }
    const candidate = `${kept.join(' ')}…`;
    if (ctx.measureText(candidate).width <= TEXT_MAX_W) return candidate;
  }

  let label = title;
  while (label.length > 1 && ctx.measureText(`${label}…`).width > TEXT_MAX_W) {
    label = label.slice(0, -1);
  }
  return `${label}…`;
}

function maxFontForSegment(segAngle: number): number {
  const fromArc = Math.floor(segAngle * LABEL_MID_RADIUS * 0.85);
  return Math.max(MIN_FONT, Math.min(MAX_FONT, fromArc));
}

function drawSegments(
  ctx: CanvasRenderingContext2D,
  movies: MovieData[],
  rotation: number,
  palette: WheelPalette
): void {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const N = movies.length;
  const segAngle = (2 * Math.PI) / N;

  for (let i = 0; i < N; i++) {
    const startA = -Math.PI / 2 + rotation + i * segAngle;
    const endA = startA + segAngle;
    const color = palette.segments[i % palette.segments.length] ?? '';

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, RADIUS, startA, endA);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = palette.divider;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const midA = startA + segAngle / 2;
    const readsRightToLeft = Math.cos(midA) < 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(readsRightToLeft ? midA + Math.PI : midA);
    ctx.textBaseline = 'middle';
    ctx.textAlign = readsRightToLeft ? 'left' : 'right';

    const title = movies[i]?.title ?? '';
    applyFittedFont(ctx, title, maxFontForSegment(segAngle), palette.fontFamily);
    const label = truncateToWidth(ctx, title);

    ctx.shadowColor = palette.labelShadow;
    ctx.shadowBlur = 4;
    ctx.fillStyle = palette.label;
    ctx.fillText(label, readsRightToLeft ? -LABEL_OUTER : LABEL_OUTER, 0);
    ctx.restore();
  }
}

function drawHubAndPointer(ctx: CanvasRenderingContext2D, palette: WheelPalette): void {
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
  ctx.fillStyle = palette.hub;
  ctx.shadowColor = palette.hubShadow;
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.strokeStyle = palette.hubStroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const tipY = cy - RADIUS + 6;
  const baseY = cy - RADIUS - 20;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, tipY);
  ctx.lineTo(cx - 10, baseY);
  ctx.lineTo(cx + 10, baseY);
  ctx.closePath();
  ctx.fillStyle = palette.pointer;
  ctx.shadowColor = palette.pointerShadow;
  ctx.shadowBlur = 5;
  ctx.fill();
  ctx.strokeStyle = palette.pointerStroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

type WheelLayers = {
  disc: HTMLCanvasElement;
  overlay: HTMLCanvasElement;
  restRotation: number;
};

function createLayer(dpr: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const layer = document.createElement('canvas');
  layer.width = SIZE * dpr;
  layer.height = SIZE * dpr;
  const ctx = layer.getContext('2d');
  ctx?.scale(dpr, dpr);
  return [layer, ctx];
}

function renderLayers(
  movies: MovieData[],
  restRotation: number,
  dpr: number,
  palette: WheelPalette
): WheelLayers {
  const [disc, discCtx] = createLayer(dpr);
  if (discCtx) drawSegments(discCtx, movies, restRotation, palette);
  const [overlay, overlayCtx] = createLayer(dpr);
  if (overlayCtx) drawHubAndPointer(overlayCtx, palette);
  return { disc, overlay, restRotation };
}

function drawFrame(ctx: CanvasRenderingContext2D, layers: WheelLayers, rotation: number): void {
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation - layers.restRotation);
  ctx.drawImage(layers.disc, -cx, -cy, SIZE, SIZE);
  ctx.restore();
  ctx.drawImage(layers.overlay, 0, 0, SIZE, SIZE);
}

interface SpinningWheelProps {
  movies: MovieData[];
  winnerIndex: number;
  onDone: () => void;
}

export default function SpinningWheel({
  movies,
  winnerIndex,
  onDone,
}: Readonly<SpinningWheelProps>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    const N = movies.length;
    if (N === 0) return;
    const segAngle = (2 * Math.PI) / N;
    const jitter = randomCenteredUnit() * segAngle * 0.4;
    const targetRotation = SPIN_ROTATIONS * 2 * Math.PI - (winnerIndex + 0.5) * segAngle + jitter;
    const layers = renderLayers(movies, targetRotation, dpr, readWheelPalette(canvas));

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      drawFrame(ctx, layers, targetRotation);
      const timeoutId = setTimeout(() => onDoneRef.current(), 0);
      return () => clearTimeout(timeoutId);
    }

    let startTime: number | null = null;
    const ANIM_CUT = 0.9;

    function animate(ts: number): void {
      startTime ??= ts;
      const t = Math.min((ts - startTime) / WHEEL_SPIN_DURATION_MS, 1);
      drawFrame(ctx!, layers, easeOutQuint(t) * targetRotation);

      if (t < ANIM_CUT) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        drawFrame(ctx!, layers, targetRotation);
        onDoneRef.current();
      }
    }

    drawFrame(ctx, layers, 0);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [movies, winnerIndex]);

  return (
    <div className={styles.wrapper} aria-hidden>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
