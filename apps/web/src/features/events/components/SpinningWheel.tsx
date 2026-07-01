import { useEffect, useRef } from 'react';
import type { MovieData } from '@/shared/types/movie';
import styles from './SpinningWheel.module.css';

const SIZE = 460;
const RADIUS = 200;
const SPIN_ROTATIONS = 8;
const SPIN_DURATION_MS = 7500;

const COLORS = [
  '#2563EB',
  '#7C3AED',
  '#06B6D4',
  '#EC4899',
  '#F97316',
  '#4F46E5',
  '#10B981',
  '#0891B2',
  '#8B5CF6',
  '#D97706',
  '#0D9488',
  '#DB2777',
];

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

const TEXT_MAX_W = RADIUS - 30;
const MAX_FONT = 18;
const MIN_FONT = 8;

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
    const color = COLORS[i % COLORS.length] ?? '#2563EB';

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, RADIUS, startA, endA);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startA + segAngle / 2);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';

    const title = movies[i]?.title ?? '';
    let fontSize = MAX_FONT;
    ctx.font = `700 ${fontSize}px Overpass, system-ui, sans-serif`;
    while (fontSize > MIN_FONT && ctx.measureText(title).width > TEXT_MAX_W) {
      fontSize--;
      ctx.font = `700 ${fontSize}px Overpass, system-ui, sans-serif`;
    }
    let label = title;
    if (ctx.measureText(label).width > TEXT_MAX_W) {
      while (label.length > 1 && ctx.measureText(label + '…').width > TEXT_MAX_W) {
        label = label.slice(0, -1);
      }
      label += '…';
    }

    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, RADIUS - 10, 0);
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
    canvas.style.width = `${SIZE}px`;
    canvas.style.height = `${SIZE}px`;
    ctx.scale(dpr, dpr);

    const N = movies.length;
    const segAngle = (2 * Math.PI) / N;
    const jitter =
      (crypto.getRandomValues(new Uint32Array(1))[0]! / 0xffffffff - 0.5) * segAngle * 0.4;
    const targetRotation = SPIN_ROTATIONS * 2 * Math.PI - (winnerIndex + 0.5) * segAngle + jitter;

    let startTime: number | null = null;
    const ANIM_CUT = 0.9;

    function animate(ts: number): void {
      if (startTime === null) startTime = ts;
      const t = Math.min((ts - startTime) / SPIN_DURATION_MS, 1);
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
