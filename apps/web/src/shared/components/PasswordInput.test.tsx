import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Field from '@/shared/components/Field';
import PasswordInput from '@/shared/components/PasswordInput';
import { LocaleProvider } from '@/shared/i18n';

function renderPassword() {
  return render(
    <LocaleProvider>
      <Field label="Mot de passe" htmlFor="pwd">
        {({ id }) => (
          <PasswordInput id={id} value="secret12" onChange={() => {}} autoComplete="new-password" />
        )}
      </Field>
    </LocaleProvider>
  );
}

describe('PasswordInput', () => {
  it('hides the password until the reader asks to see it', async () => {
    const user = userEvent.setup();
    renderPassword();

    const field = screen.getByLabelText('Mot de passe');
    const toggle = screen.getByRole('button', { name: 'Afficher le mot de passe' });
    expect(field).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(field).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle);
    expect(field).toHaveAttribute('type', 'password');
  });

  it('keeps the attributes given to the field', () => {
    renderPassword();

    const field = screen.getByLabelText('Mot de passe');
    expect(field).toHaveAttribute('autocomplete', 'new-password');
    expect(field).toHaveClass('input');
  });
});
