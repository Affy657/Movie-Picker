import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SegmentedRadioGroup from '@/shared/components/SegmentedRadioGroup';
import styles from '@/shared/components/SegmentedRadioGroup.module.css';

type Choice = 'grid' | 'list' | 'map';

const OPTIONS = [
  { value: 'grid', label: 'Grille', icon: <span data-testid="icon-grid" /> },
  { value: 'list', label: 'Liste' },
  { value: 'map', label: 'Carte' },
] as const satisfies ReadonlyArray<{ value: Choice; label: string; icon?: React.ReactNode }>;

function setup(props: Partial<React.ComponentProps<typeof SegmentedRadioGroup<Choice>>> = {}) {
  const onChange = vi.fn();
  render(
    <SegmentedRadioGroup
      options={OPTIONS}
      value="grid"
      onChange={onChange}
      ariaLabel="Affichage"
      {...props}
    />
  );
  return { onChange };
}

describe('SegmentedRadioGroup', () => {
  it('is a labelled radiogroup whose selected option alone is checked and tabbable', () => {
    setup();
    expect(screen.getByRole('radiogroup', { name: 'Affichage' })).toBeInTheDocument();
    const grid = screen.getByRole('radio', { name: 'Grille' });
    const list = screen.getByRole('radio', { name: 'Liste' });
    expect(grid).toHaveAttribute('aria-checked', 'true');
    expect(grid).toHaveAttribute('tabindex', '0');
    expect(list).toHaveAttribute('aria-checked', 'false');
    expect(list).toHaveAttribute('tabindex', '-1');
    expect(grid.className).toContain(styles.optionSelected);
  });

  it('selects on click', async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Liste' }));
    expect(onChange).toHaveBeenCalledWith('list');
  });

  it('moves with the arrows and wraps around, Home and End jump to the ends', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ value: 'map' });
    screen.getByRole('radio', { name: 'Carte' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('grid');
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('map');
    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('grid');
    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('map');
  });

  it('moves focus with the selection so repeated arrows keep walking the options', async () => {
    const user = userEvent.setup();
    function ControlledGroup() {
      const [choice, setChoice] = useState<Choice>('grid');
      return (
        <SegmentedRadioGroup
          options={OPTIONS}
          value={choice}
          onChange={setChoice}
          ariaLabel="Affichage"
        />
      );
    }
    render(<ControlledGroup />);
    screen.getByRole('radio', { name: 'Grille' }).focus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Liste' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    const map = screen.getByRole('radio', { name: 'Carte' });
    expect(map).toHaveFocus();
    expect(map).toHaveAttribute('aria-checked', 'true');

    await user.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: 'Grille' })).toHaveFocus();

    await user.keyboard('{End}');
    expect(map).toHaveFocus();
  });

  it('keeps the label as the accessible name when an option shows its icon alone', () => {
    setup({ iconOnly: true });
    const grid = screen.getByRole('radio', { name: 'Grille' });
    expect(grid).toHaveAttribute('aria-label', 'Grille');
    expect(grid.className).toContain(styles.optionIcon);
    expect(screen.getByTestId('icon-grid')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Liste' })).toHaveTextContent('Liste');
  });

  it('disables every option at once and ignores clicks and arrows meanwhile', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ disabled: true });
    const list = screen.getByRole('radio', { name: 'Liste' });
    expect(list).toBeDisabled();

    await user.click(list);
    screen.getByRole('radio', { name: 'Grille' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies the compact size classes', () => {
    setup({ size: 'sm' });
    expect(screen.getByRole('radiogroup').className).toContain(styles.rootSm);
    expect(screen.getByRole('radio', { name: 'Grille' }).className).toContain(styles.optionSm);
  });

  it('refuses a group without any accessible name at compile time', () => {
    render(
      // @ts-expect-error a radiogroup is named by ariaLabel or ariaLabelledBy
      <SegmentedRadioGroup options={OPTIONS} value="grid" onChange={vi.fn()} />
    );

    expect(screen.getByRole('radiogroup')).not.toHaveAttribute('aria-label');
  });
});
