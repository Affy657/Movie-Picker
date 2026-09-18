import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Dropdown from '@/shared/components/Dropdown';
import styles from '@/shared/components/Dropdown.module.css';

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
] as const;

const setup = (value: 'a' | 'b' | 'c' = 'a') => {
  const onChange = vi.fn();
  render(<Dropdown value={value} options={OPTIONS} onChange={onChange} ariaLabel="Choix" />);
  return { onChange, trigger: screen.getByRole('button', { name: 'Choix' }) };
};

describe('Dropdown', () => {
  it('renders the selected label and stays collapsed', () => {
    const { trigger } = setup('a');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('Alpha');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the listbox on click', async () => {
    const { trigger } = setup();

    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('selects an option on click and closes', async () => {
    const { onChange, trigger } = setup();

    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('option', { name: 'Beta' }));

    expect(onChange).toHaveBeenCalledWith('b');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens with ArrowDown when collapsed', async () => {
    const { trigger } = setup();
    trigger.focus();

    await userEvent.keyboard('{ArrowDown}');

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('navigates with arrows and selects with Enter', async () => {
    const { onChange, trigger } = setup('a');

    await userEvent.click(trigger);
    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('jumps to the last option with End and selects it', async () => {
    const { onChange, trigger } = setup('a');

    await userEvent.click(trigger);
    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'End' });
    fireEvent.keyDown(listbox, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('closes on Escape without selecting', async () => {
    const { onChange, trigger } = setup();

    await userEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('skips a disabled option with the arrows and refuses to select it', async () => {
    const onChange = vi.fn();
    render(
      <Dropdown
        value="a"
        options={[OPTIONS[0], { ...OPTIONS[1], disabled: true }, OPTIONS[2]]}
        onChange={onChange}
        ariaLabel="Choix"
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Choix' }));
    const listbox = screen.getByRole('listbox');
    expect(screen.getByRole('option', { name: 'Beta' })).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(screen.getByRole('option', { name: 'Beta' }));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('inline, gives up the full width of its container', () => {
    render(<Dropdown value="a" options={OPTIONS} onChange={vi.fn()} ariaLabel="Choix" inline />);

    expect(screen.getByRole('button', { name: 'Choix' }).parentElement).toHaveClass(styles.inline!);
  });

  it('disables the trigger when the whole control is disabled', () => {
    render(<Dropdown value="a" options={OPTIONS} onChange={vi.fn()} ariaLabel="Choix" disabled />);
    expect(screen.getByRole('button', { name: 'Choix' })).toBeDisabled();
  });

  it('opens upward when the placement says so', async () => {
    render(
      <Dropdown value="a" options={OPTIONS} onChange={vi.fn()} ariaLabel="Choix" placement="top" />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Choix' }));

    expect(screen.getByRole('listbox')).toHaveClass(styles.menuUp!);
  });

  it('auto placement opens downward when the menu fits below the trigger', async () => {
    const { trigger } = setup();

    await userEvent.click(trigger);

    expect(screen.getByRole('listbox')).not.toHaveClass(styles.menuUp!);
  });

  it('auto placement flips upward when the menu would end below the viewport', async () => {
    const innerHeight = vi.spyOn(globalThis, 'innerHeight', 'get').mockReturnValue(800);
    const rects = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const menu = this.getAttribute('role') === 'listbox';
        return {
          top: menu ? 780 : 740,
          bottom: menu ? 900 : 780,
          height: menu ? 120 : 40,
          left: 0,
          right: 200,
          width: 200,
          x: 0,
          y: menu ? 780 : 740,
          toJSON: () => ({}),
        } as DOMRect;
      });
    try {
      const { trigger } = setup();

      await userEvent.click(trigger);

      expect(screen.getByRole('listbox')).toHaveClass(styles.menuUp!);
    } finally {
      rects.mockRestore();
      innerHeight.mockRestore();
    }
  });

  it('closes when clicking outside', async () => {
    const { trigger } = setup();

    await userEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
