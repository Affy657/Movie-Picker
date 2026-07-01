import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Dropdown from '@/shared/components/Dropdown';

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

  it('closes when clicking outside', async () => {
    const { trigger } = setup();

    await userEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
