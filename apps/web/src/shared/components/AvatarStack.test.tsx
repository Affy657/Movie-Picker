import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AvatarStack from './AvatarStack';
import styles from './AvatarStack.module.css';

const PEOPLE = [
  { key: '1', avatarId: null, pseudo: 'Alice' },
  { key: '2', avatarId: null, pseudo: 'Bob' },
  { key: '3', avatarId: null, pseudo: 'Chloé' },
  { key: '4', avatarId: null, pseudo: 'Dan' },
  { key: '5', avatarId: null, pseudo: 'Eve' },
];

describe('AvatarStack', () => {
  it('shows at most max avatars and a +N pill for the rest', () => {
    render(<AvatarStack people={PEOPLE} max={3} />);
    expect(screen.getAllByText(/^[A-Z]{2}$/)).toHaveLength(3);
    expect(screen.getByText('+2').parentElement).toHaveClass(styles.more!);
  });

  it('is decorative by default and an image when labelled', () => {
    const { container, rerender } = render(<AvatarStack people={PEOPLE.slice(0, 2)} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByText(/^\+/)).toBeNull();

    rerender(<AvatarStack people={PEOPLE.slice(0, 2)} label="Alice et Bob" />);
    expect(screen.getByRole('img', { name: 'Alice et Bob' })).toBeInTheDocument();
  });

  it('takes an explicit hidden count when the list is only a sample', () => {
    render(<AvatarStack people={PEOPLE.slice(0, 2)} hidden={7} />);
    expect(screen.getByText('+7')).toBeInTheDocument();
  });

  it('renders nothing for an empty list', () => {
    const { container } = render(<AvatarStack people={[]} />);
    expect(container.firstElementChild).toBeNull();
  });
});
