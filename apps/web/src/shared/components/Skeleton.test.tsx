import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import styles from '@/shared/components/Skeleton.module.css';

describe('Skeleton', () => {
  it('is decorative and takes the requested variant', () => {
    const { container } = render(<Skeleton variant="circle" className="extra" />);

    const skeleton = container.firstElementChild;
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton).toHaveClass(styles.skeleton!, styles.circle!, 'extra');
  });

  it('converts numeric dimensions to pixels and keeps strings as they are', () => {
    const { container } = render(<Skeleton width={120} height="50%" style={{ opacity: 0.5 }} />);

    const skeleton = container.firstElementChild as HTMLElement;
    expect(skeleton.style.width).toBe('120px');
    expect(skeleton.style.height).toBe('50%');
    expect(skeleton.style.opacity).toBe('0.5');
  });
});

describe('SkeletonScreen', () => {
  it('announces the loading to the screen reader and hides the label visually', () => {
    render(
      <SkeletonScreen label="Chargement du profil">
        <Skeleton />
      </SkeletonScreen>
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Chargement du profil')).toHaveClass('visually-hidden');
  });
});
