import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import userEvent from '@testing-library/user-event';
import Chip from '@/shared/components/Chip';
import styles from '@/shared/components/Chip.module.css';
import dotStyles from '@/shared/components/StatusDot.module.css';

describe('Chip', () => {
  it('renders a non-interactive element by default', () => {
    render(<Chip data-testid="c">Comédie</Chip>);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('c').textContent).toBe('Comédie');
  });

  it('devient un bouton pressable quand onClick est fourni', async () => {
    const onClick = vi.fn();
    render(
      <Chip onClick={onClick} selected={false}>
        Comédie
      </Chip>
    );

    const chip = screen.getByRole('button', { name: 'Comédie' });
    expect(chip.getAttribute('aria-pressed')).toBe('false');

    await userEvent.click(chip);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('un bouton sans selected est une action, pas un interrupteur', () => {
    render(<Chip onClick={vi.fn()}>Inviter</Chip>);
    expect(screen.getByRole('button', { name: 'Inviter' })).not.toHaveAttribute('aria-pressed');
  });

  it('selected pose le style plein et aria-pressed en une seule prop', () => {
    render(
      <Chip onClick={vi.fn()} selected>
        Comédie
      </Chip>
    );
    const chip = screen.getByRole('button', { name: 'Comédie' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip.className).toMatch(/selected/);
  });

  it('exposes a separate removal button without nesting two buttons', async () => {
    const onRemove = vi.fn();
    render(
      <Chip onRemove={onRemove} removeAriaLabel="Retirer Comédie" data-testid="c">
        Comédie
      </Chip>
    );

    expect(screen.getByTestId('c').tagName).toBe('SPAN');

    await userEvent.click(screen.getByRole('button', { name: 'Retirer Comédie' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('refuses an action and a removal on the same chip at compile time', () => {
    const onClick = vi.fn();
    const bothActions = { onClick, onRemove: vi.fn(), removeAriaLabel: 'Retirer' };
    // @ts-expect-error a chip is either an action or a removable label, never both
    render(<Chip {...bothActions}>Comédie</Chip>);

    expect(screen.queryByRole('button', { name: 'Comédie' })).toBeNull();
  });

  it('takes the default tone when none is given', () => {
    render(<Chip data-testid="c">Comédie</Chip>);

    expect(screen.getByTestId('c').className).toContain(styles.toneDefault);
  });

  it('draws a dashed outline for the placeholder chip', () => {
    render(
      <Chip dashed data-testid="c">
        Inviter
      </Chip>
    );

    expect(screen.getByTestId('c').className).toContain(styles.dashed);
  });

  it('navigates inside the app, without reloading the page, when its href is internal', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Chip href="/films/tendances">Tendances</Chip>} />
          <Route path="/films/tendances" element={<p>Tendances de la semaine</p>} />
        </Routes>
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: 'Tendances' });
    expect(link).not.toHaveAttribute('target');
    await userEvent.click(link);
    expect(screen.getByText('Tendances de la semaine')).toBeInTheDocument();
  });

  it('refuses the props of the interactive forms on a plain label at compile time', () => {
    const labelWithActionProps = { ariaLabel: 'Soirée complète', selected: true };
    // @ts-expect-error a plain label chip takes neither an accessible name nor a pressed state
    render(<Chip {...labelWithActionProps}>Complète</Chip>);

    expect(screen.getByText('Complète')).toBeInTheDocument();
  });

  it('renders a link that opens outside the app when it has an external href', () => {
    render(
      <Chip href="https://www.imdb.com/title/tt0111161/" external>
        IMDb
      </Chip>
    );

    const link = screen.getByRole('link', { name: 'IMDb' });
    expect(link).toHaveAttribute('href', 'https://www.imdb.com/title/tt0111161/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.className).toContain(styles.interactive);
  });

  it('leads its text with a status dot, pulsing while a state is pending', () => {
    render(
      <>
        <Chip tone="success" dot data-testid="saved">
          Enregistré
        </Chip>
        <Chip tone="muted" dot="pulsing" data-testid="pending">
          Enregistrement…
        </Chip>
      </>
    );

    const saved = screen.getByTestId('saved').querySelector(`.${dotStyles.dot}`);
    expect(saved).not.toBeNull();
    expect(saved?.className).not.toContain(dotStyles.pulsing);
    expect(screen.getByTestId('pending').querySelector(`.${dotStyles.pulsing}`)).not.toBeNull();
  });
});
