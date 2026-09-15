import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Avatar from '@/shared/components/Avatar';
import styles from '@/shared/components/Avatar.module.css';
import { avatarUrl } from '@/shared/utils/avatar';

describe('Avatar', () => {
  it('rend l’image de l’avatar, décorative et dimensionnée par la taille', () => {
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

  it('un pseudo d’un seul mot donne ses deux premières lettres', () => {
    const { container } = render(<Avatar avatarId={undefined} pseudo="zoé" />);

    expect(container.textContent).toBe('ZO');
  });

  it('sans avatar ni pseudo, rend une pastille vide', () => {
    const { container } = render(<Avatar avatarId={null} size="xs" />);

    const placeholder = container.firstElementChild;
    expect(placeholder).toHaveClass(styles.placeholder!);
    expect(placeholder).toHaveAttribute('aria-hidden', 'true');
    expect(placeholder).toHaveStyle({ width: '20px', height: '20px' });
  });

  it('la couleur des initiales ne dépend que du pseudo', () => {
    const first = render(<Avatar avatarId={null} pseudo="Alice" />).container.firstElementChild;
    const again = render(<Avatar avatarId={null} pseudo="Alice" />).container.firstElementChild;

    expect((first as HTMLElement).style.background).toBe((again as HTMLElement).style.background);
  });
});
