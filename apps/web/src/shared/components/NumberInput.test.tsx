import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NumberInput from '@/shared/components/NumberInput';
import { LocaleProvider } from '@/shared/i18n';

const setup = (props: Partial<Parameters<typeof NumberInput>[0]> = {}) => {
  const onChange = vi.fn();
  render(
    <LocaleProvider>
      <NumberInput value="" onChange={onChange} {...props} />
    </LocaleProvider>
  );
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

  it('disables decrement at the minimum', () => {
    const { minus } = setup({ value: '0', min: 0 });

    expect(minus).toBeDisabled();
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

  describe('with an unlimited value', () => {
    const unlimited = { label: 'Sans limite', fallback: 3 };

    it('names the empty value instead of leaving the field blank', () => {
      const { input } = setup({ unlimited });

      expect(input).toHaveAttribute('placeholder', 'Sans limite');
    });

    it('steps down from unlimited to the usual limit', async () => {
      const { onChange, minus } = setup({ unlimited, min: 1, max: 15 });

      await userEvent.click(minus);

      expect(onChange).toHaveBeenCalledWith('3');
    });

    it('cannot go above unlimited', () => {
      const { plus } = setup({ unlimited, min: 1, max: 15 });

      expect(plus).toBeDisabled();
    });

    it('steps up from the cap to unlimited', async () => {
      const { onChange, plus } = setup({ unlimited, value: '15', min: 1, max: 15 });

      await userEvent.click(plus);

      expect(onChange).toHaveBeenCalledWith('');
    });
  });
});
