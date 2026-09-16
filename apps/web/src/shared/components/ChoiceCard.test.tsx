import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChoiceCard, ChoiceGroup } from './ChoiceCard';
import styles from './ChoiceCard.module.css';

function renderGroup(value: string | null, onChange = vi.fn()) {
  render(
    <ChoiceGroup value={value} onChange={onChange} ariaLabel="Mode">
      <ChoiceCard value="a" title="Pondérée" description="Les votes comptent" indicator />
      <ChoiceCard value="b" title="Aléatoire" indicator />
      <ChoiceCard value="c" label="Aucun" dashed>
        Aucun
      </ChoiceCard>
    </ChoiceGroup>
  );
  return onChange;
}

describe('ChoiceGroup and ChoiceCard', () => {
  it('is a radiogroup of radios, the selected one checked and the only tabbable one', () => {
    renderGroup('b');
    expect(screen.getByRole('radiogroup', { name: 'Mode' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'Aléatoire' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('radio', { name: 'Aléatoire' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: /Pondérée/ })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('radio', { name: 'Aléatoire' })).toHaveClass(styles.selected!);
  });

  it('without selection, the first card takes the tab stop', () => {
    renderGroup(null);
    expect(screen.getByRole('radio', { name: /Pondérée/ })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Aléatoire' })).toHaveAttribute('tabindex', '-1');
  });

  it('selects on click and on arrow keys, wrapping around', async () => {
    const user = userEvent.setup();
    const onChange = renderGroup('a');

    await user.click(screen.getByRole('radio', { name: 'Aléatoire' }));
    expect(onChange).toHaveBeenLastCalledWith('b');

    screen.getByRole('radio', { name: /Pondérée/ }).focus();
    await user.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith('b');
    expect(screen.getByRole('radio', { name: 'Aléatoire' })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith('a');
    await user.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith('c');
    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('a');
    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('c');
  });

  it('shows the title, the description and the dashed variant', () => {
    renderGroup('a');
    expect(screen.getByText('Les votes comptent')).toHaveClass(styles.description!);
    expect(screen.getByRole('radio', { name: 'Aucun' })).toHaveClass(styles.dashed!);
    expect(
      screen.getByRole('radio', { name: /Pondérée/ }).querySelector(`.${styles.indicator!}`)
    ).not.toBeNull();
  });
});
