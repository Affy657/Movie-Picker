import { useCallback, useMemo } from 'react';
import styles from './DurationRangeSlider.module.css';

interface DurationRangeSliderProps {
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  formatLabel: (value: number, bound: 'min' | 'max') => string;
  ariaLabelMin: string;
  ariaLabelMax: string;
}

export default function DurationRangeSlider({
  min,
  max,
  step,
  valueMin,
  valueMax,
  onChange,
  formatLabel,
  ariaLabelMin,
  ariaLabelMax,
}: Readonly<DurationRangeSliderProps>) {
  const getPercent = useCallback(
    (value: number) => ((value - min) / (max - min)) * 100,
    [min, max]
  );

  const rangeStyle = useMemo(
    () => ({
      left: `${getPercent(valueMin)}%`,
      width: `${getPercent(valueMax) - getPercent(valueMin)}%`,
    }),
    [getPercent, valueMin, valueMax]
  );

  const minThumbOnTop = valueMin >= min + (max - min) * 0.9;

  return (
    <div className={styles.wrapper}>
      <div className={styles.track} />
      <div className={styles.range} style={rangeStyle} />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMin}
        aria-label={ariaLabelMin}
        onChange={(e) => {
          const next = Math.min(Number(e.target.value), valueMax);
          onChange(next, valueMax);
        }}
        className={styles.thumb}
        style={{ zIndex: minThumbOnTop ? 5 : 3 }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMax}
        aria-label={ariaLabelMax}
        onChange={(e) => {
          const next = Math.max(Number(e.target.value), valueMin);
          onChange(valueMin, next);
        }}
        className={styles.thumb}
        style={{ zIndex: minThumbOnTop ? 3 : 4 }}
      />
      <div className={styles.labels}>
        <span>{formatLabel(valueMin, 'min')}</span>
        <span>{formatLabel(valueMax, 'max')}</span>
      </div>
    </div>
  );
}
