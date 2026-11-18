import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMenuState } from './useMenuState';

type TriggerBox = { top: number; bottom: number };

function Probe({
  align,
  placement,
  trigger = { top: 100, bottom: 140 },
  panelHeight = 200,
}: Readonly<{
  align?: 'left' | 'right';
  placement?: 'auto' | 'top';
  trigger?: TriggerBox;
  panelHeight?: number;
}>) {
  const menu = useMenuState({ align, placement });
  return (
    <div
      ref={(node) => {
        menu.containerRef.current = node;
        if (node) {
          node.getBoundingClientRect = () => ({ left: 500, right: 600, ...trigger }) as DOMRect;
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
            if (node) {
              Object.defineProperty(node, 'offsetWidth', { value: 300 });
              Object.defineProperty(node, 'scrollHeight', { value: panelHeight });
            }
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

  it('opens below its trigger when the panel fits there', async () => {
    render(<Probe trigger={{ top: 100, bottom: 140 }} panelHeight={200} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));

    const panel = screen.getByRole('menu');
    expect(panel).toHaveAttribute('data-placement', 'bottom');
    expect(panel.style.maxHeight).toBe('');
  });

  it('opens above its trigger when the bottom of the screen has no room left for it', async () => {
    render(<Probe trigger={{ top: 660, bottom: 700 }} panelHeight={200} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));

    const panel = screen.getByRole('menu');
    expect(panel).toHaveAttribute('data-placement', 'top');
    expect(panel.style.maxHeight).toBe('');
  });

  it('caps a panel taller than the room on both sides and lets it scroll', async () => {
    render(<Probe trigger={{ top: 300, bottom: 340 }} panelHeight={900} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));

    const panel = screen.getByRole('menu');
    const roomBelow = globalThis.innerHeight - 340 - 6 - 8;
    expect(panel).toHaveAttribute('data-placement', 'bottom');
    expect(panel).toHaveStyle({ maxHeight: `${roomBelow}px`, overflowY: 'auto' });
  });

  it('opens above its trigger when asked, even with room below, for a bar docked at the bottom', async () => {
    render(<Probe placement="top" trigger={{ top: 400, bottom: 440 }} panelHeight={60} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));

    expect(screen.getByRole('menu')).toHaveAttribute('data-placement', 'top');
  });

  it('caps a panel asked to open above to the room left there', async () => {
    render(<Probe placement="top" trigger={{ top: 200, bottom: 240 }} panelHeight={600} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));

    const panel = screen.getByRole('menu');
    expect(panel).toHaveAttribute('data-placement', 'top');
    expect(panel).toHaveStyle({ maxHeight: `${200 - 6 - 8}px` });
  });
});
