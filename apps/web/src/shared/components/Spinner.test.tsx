import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Spinner from './Spinner';
import styles from './Spinner.module.css';

describe('Spinner', () => {
  it('is decorative and sized by the surrounding font', () => {
    const { container } = render(<Spinner className="extra" />);
    const spinner = container.firstElementChild;
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
    expect(spinner).toHaveClass(styles.spinner!);
    expect(spinner).toHaveClass('extra');
  });
});
