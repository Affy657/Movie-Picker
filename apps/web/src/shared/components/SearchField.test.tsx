import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchField from '@/shared/components/SearchField';

describe('SearchField', () => {
  it('renders a named search field, with its description', () => {
    render(
      <>
        <SearchField
          id="q"
          value=""
          onChange={vi.fn()}
          placeholder="Chercher un film"
          ariaLabel="Recherche"
          ariaDescribedBy="q-hint"
        />
        <p id="q-hint">Titre ou année</p>
      </>
    );

    const input = screen.getByRole('searchbox', { name: 'Recherche' });
    expect(input).toHaveAttribute('id', 'q');
    expect(input).toHaveAttribute('placeholder', 'Chercher un film');
    expect(input).toHaveAccessibleDescription('Titre ou année');
  });

  it('reports every keystroke with the full value', async () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} placeholder="Chercher" />);

    await userEvent.type(screen.getByRole('searchbox'), 'ab');

    expect(onChange).toHaveBeenNthCalledWith(1, 'a');
    expect(onChange).toHaveBeenNthCalledWith(2, 'b');
  });

  it('reflects the controlled value', () => {
    render(<SearchField value="Dune" onChange={vi.fn()} placeholder="Chercher" />);

    expect(screen.getByRole('searchbox')).toHaveValue('Dune');
  });
});
