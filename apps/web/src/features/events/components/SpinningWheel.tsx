import { useEffect, useRef } from 'react';
import type { MovieData } from '@/shared/types/movie';
import { WHEEL_SPIN_DURATION_MS } from '@/shared/utils/wheelSpin';
import { randomCenteredUnit } from '@/shared/utils/random';
import styles from './SpinningWheel.module.css';

const SIZE = 460;
const RADIUS = 200;
const SPIN_ROTATIONS = 8;

export const WHEEL_SEGMENT_COLORS = [
  '#2563EB',
  '#C2410C',
  '#0F766E',
  '#BE185D',
  '#B45309',
  '#0369A1',
  '#A21CAF',
  '#047857',
  '#0E7490',
  '#4F46E5',
  '#6D28D9',
  '#9A3412',
];

const LABEL_COLOR = '#ffffff';

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

const LABEL_OUTER = RADIUS - 12;
const LABEL_INNER = 26;
const TEXT_MAX_W = LABEL_OUTER - LABEL_INNER;
const LABEL_MID_RADIUS = (LABEL_OUTER + LABEL_INNER) / 2;
const MAX_FONT = 18;
const MIN_FONT = 10;

function setFont(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.font = `700 ${size}px Overpass, system-ui, sans-serif`;
}

function applyFittedFont(ctx: CanvasRenderingContext2D, title: string, maxFont: number): void {
  let size = maxFont;
  setFont(ctx, size);
  while (size > MIN_FONT && ctx.measureText(title).width > TEXT_MAX_W) {
    size--;
    setFont(ctx, size);
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

function drawFrame(ctx: CanvasRenderingContext2D, movies: MovieData[], rotation: number): void {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const N = movies.length;
  if (N === 0) return;

  const segAngle = (2 * Math.PI) / N;

  ctx.clearRect(0, 0, SIZE, SIZE);

  for (let i = 0; i < N; i++) {
    const startA = -Math.PI / 2 + rotation + i * segAngle;
    const endA = startA + segAngle;
    const color = WHEEL_SEGMENT_COLORS[i % WHEEL_SEGMENT_COLORS.length] ?? '#2563EB';

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, RADIUS, startA, endA);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
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
    applyFittedFont(ctx, title, maxFontForSegment(segAngle));
    const label = truncateToWidth(ctx, title);

    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = LABEL_COLOR;
    ctx.fillText(label, readsRightToLeft ? -LABEL_OUTER : LABEL_OUTER, 0);
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
  ctx.fillStyle = '#f8fafc';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
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
  ctx.fillStyle = '#EF4444';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 5;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
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
    const segAngle = (2 * Math.PI) / N;
    const jitter = randomCenteredUnit() * segAngle * 0.4;
    const targetRotation = SPIN_ROTATIONS * 2 * Math.PI - (winnerIndex + 0.5) * segAngle + jitter;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      drawFrame(ctx, movies, targetRotation);
      const timeoutId = setTimeout(() => onDoneRef.current(), 0);
      return () => clearTimeout(timeoutId);
    }

    let startTime: number | null = null;
    const ANIM_CUT = 0.9;

    function animate(ts: number): void {
      startTime ??= ts;
      const t = Math.min((ts - startTime) / WHEEL_SPIN_DURATION_MS, 1);
      drawFrame(ctx!, movies, easeOutQuint(t) * targetRotation);

      if (t < ANIM_CUT) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        drawFrame(ctx!, movies, targetRotation);
        onDoneRef.current();
      }
    }

    drawFrame(ctx, movies, 0);
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
