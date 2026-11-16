import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMenuState } from './useMenuState';

function Probe({ align }: Readonly<{ align?: 'left' | 'right' }>) {
  const menu = useMenuState({ align });
  return (
    <div
      ref={(node) => {
        menu.containerRef.current = node;
        if (node) {
          node.getBoundingClientRect = () => ({ left: 500, right: 600 }) as DOMRect;
        }
      }}
    >
      <button type="button" {...menu.triggerProps}>
        Ouvrir
      </button>
      {menu.open ? (
        <div
          role="menu"
          {...menu.panelProps}
          ref={(node) => {
            menu.panelProps.ref.current = node;
            if (node) Object.defineProperty(node, 'offsetWidth', { value: 300 });
          }}
        />
      ) : null}
    </div>
  );
}

describe('useMenuState', () => {
  it('lines the panel up with the right edge of its trigger by default', async () => {
    render(<Probe />);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));

    expect(screen.getByRole('menu')).toHaveStyle({ left: '-200px' });
  });

  it('lines the panel up with the left edge of its trigger when asked', async () => {
    render(<Probe align="left" />);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));

    expect(screen.getByRole('menu')).toHaveStyle({ left: '0px' });
  });
});
