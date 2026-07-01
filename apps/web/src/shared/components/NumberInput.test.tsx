import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NumberInput from '@/shared/components/NumberInput';

const setup = (props: Partial<Parameters<typeof NumberInput>[0]> = {}) => {
  const onChange = vi.fn();
  render(<NumberInput value="" onChange={onChange} {...props} />);
  return {
    onChange,
    input: screen.getByRole('spinbutton'),
    minus: screen.getByRole('button', { name: 'Diminuer' }),
    plus: screen.getByRole('button', { name: 'Augmenter' }),
  };
};

describe('NumberInput', () => {
  it('increments the current value', async () => {
    const { onChange, plus } = setup({ value: '5' });

    await userEvent.click(plus);

    expect(onChange).toHaveBeenCalledWith('6');
  });

  it('decrements the current value', async () => {
    const { onChange, minus } = setup({ value: '5' });

    await userEvent.click(minus);

    expect(onChange).toHaveBeenCalledWith('4');
  });

  it('clears the value when decrementing below min', async () => {
    const { onChange, minus } = setup({ value: '0', min: 0 });

    await userEvent.click(minus);

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('starts from 1 when incrementing an empty value with no min', async () => {
    const { onChange, plus } = setup({ value: '' });

    await userEvent.click(plus);

    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('starts from min when incrementing an empty value with a min', async () => {
    const { onChange, plus } = setup({ value: '', min: 3 });

    await userEvent.click(plus);

    expect(onChange).toHaveBeenCalledWith('3');
  });

  it('disables decrement when the value is empty', () => {
    const { minus } = setup({ value: '' });

    expect(minus).toBeDisabled();
  });

  it('disables increment at the maximum', () => {
    const { plus } = setup({ value: '10', max: 10 });

    expect(plus).toBeDisabled();
  });

  it('propagates raw input changes', async () => {
    const { onChange, input } = setup({ value: '' });

    await userEvent.type(input, '7');

    expect(onChange).toHaveBeenCalledWith('7');
  });

  it('disables everything when disabled', () => {
    const { input, minus, plus } = setup({ value: '5', disabled: true });

    expect(input).toBeDisabled();
    expect(minus).toBeDisabled();
    expect(plus).toBeDisabled();
  });
});
