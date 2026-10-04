import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import ScoreBar from '@/features/movies/components/ScoreBar';
import styles from '@/features/movies/components/ScoreBar.module.css';

describe('ScoreBar', () => {
  it('splits the track between approvals and rejections', () => {
    const { container } = render(<ScoreBar upRatio={75} downRatio={25} className="placed" />);

    const bar = container.firstElementChild as HTMLElement;
    expect(bar.className).toContain(styles.scoreBar);
    expect(bar.className).toContain('placed');
    expect((bar.querySelector(`.${styles.scoreBarUp}`) as HTMLElement).style.flexBasis).toBe('75%');
    expect((bar.querySelector(`.${styles.scoreBarDown}`) as HTMLElement).style.flexBasis).toBe(
      '25%'
    );
  });

  it('draws an empty track without votes', () => {
    const { container } = render(<ScoreBar upRatio={0} downRatio={0} />);

    expect(container.firstElementChild?.childElementCount).toBe(0);
  });
});
