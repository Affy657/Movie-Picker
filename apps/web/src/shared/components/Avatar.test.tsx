import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Avatar from '@/shared/components/Avatar';
import styles from '@/shared/components/Avatar.module.css';
import { avatarUrl } from '@/shared/utils/avatar';

describe('Avatar', () => {
  it('renders the avatar image, decorative and sized by the size prop', () => {
    const { container } = render(<Avatar avatarId="cat-3" size="lg" />);

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', avatarUrl('cat-3'));
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img).toHaveAttribute('width', '56');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('sans avatar, affiche les initiales du pseudo en majuscules', () => {
    const { container } = render(<Avatar avatarId={null} pseudo="léa martin" />);

    expect(container.textContent).toBe('LM');
    expect(container.firstElementChild).toHaveClass(styles.initials!);
    expect(container.querySelector('img')).toBeNull();
  });

  it('a single-word pseudo gives its first two letters', () => {
    const { container } = render(<Avatar avatarId={undefined} pseudo="zoé" />);

    expect(container.textContent).toBe('ZO');
  });

  it('sans avatar ni pseudo, rend une pastille vide', () => {
    const { container } = render(<Avatar avatarId={null} size="xs" />);

    const placeholder = container.firstElementChild;
    expect(placeholder).toHaveClass(styles.placeholder!);
    expect(placeholder).toHaveClass(styles.xs!);
    expect(placeholder).toHaveAttribute('aria-hidden', 'true');
    expect(placeholder).not.toHaveAttribute('style');
  });

  it('the colour of the initials is a palette token that only depends on the pseudo', () => {
    const first = render(<Avatar avatarId={null} pseudo="Alice" />).container.firstElementChild;
    const again = render(<Avatar avatarId={null} pseudo="Alice" />).container.firstElementChild;
    const other = render(<Avatar avatarId={null} pseudo="Bob" />).container.firstElementChild;

    expect(first).toHaveAttribute('data-palette');
    expect(first?.getAttribute('data-palette')).toBe(again?.getAttribute('data-palette'));
    expect(first?.getAttribute('data-palette')).not.toBe(other?.getAttribute('data-palette'));
    expect(first).not.toHaveAttribute('style');
  });
});
