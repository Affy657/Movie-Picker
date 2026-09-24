import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Field from '@/shared/components/Field';

describe('Field', () => {
  it('ties the label to the control and relays the hint through aria-describedby', () => {
    render(
      <Field label="Pseudo" hint="Trois caractères minimum.">
        {({ id, describedBy }) => (
          <input id={id} aria-describedby={describedBy} className="input" />
        )}
      </Field>
    );

    const input = screen.getByLabelText('Pseudo');
    const hint = screen.getByText('Trois caractères minimum.');
    expect(input.getAttribute('aria-describedby')).toBe(hint.id);
  });

  it("annonce l'erreur en premier et marque le champ comme invalide", () => {
    render(
      <Field label="Pseudo" hint="Trois caractères minimum." error="Pseudo déjà pris.">
        {({ id, describedBy, invalid }) => (
          <input id={id} aria-describedby={describedBy} aria-invalid={invalid} className="input" />
        )}
      </Field>
    );

    const input = screen.getByLabelText('Pseudo');
    const error = screen.getByRole('alert');
    const hint = screen.getByText('Trois caractères minimum.');

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(`${error.id} ${hint.id}`);
  });

  it('hands the label id to a control named through aria-labelledby', () => {
    render(
      <Field label="Langue">
        {({ labelId }) => (
          <div role="group" aria-labelledby={labelId}>
            <button type="button">Français</button>
          </div>
        )}
      </Field>
    );

    expect(screen.getByRole('group', { name: 'Langue' })).toBeInTheDocument();
  });

  it('honours an imposed htmlFor', () => {
    render(
      <Field label="Pseudo" htmlFor="handle">
        {({ id }) => <input id={id} className="input" />}
      </Field>
    );

    expect(screen.getByLabelText('Pseudo').id).toBe('handle');
  });
});
