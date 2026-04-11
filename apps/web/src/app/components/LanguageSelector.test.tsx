import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import LanguageSelector from './LanguageSelector';

function renderSelector() {
  return render(
    <LocaleProvider>
      <LanguageSelector />
    </LocaleProvider>
  );
}

beforeEach(() => {
  localStorage.setItem('moviepicker-locale', 'fr');
});

describe('LanguageSelector', () => {
  it('renders a select with FR selected by default', () => {
    renderSelector();
    const select = screen.getByRole('combobox', { name: /langue/i });
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('fr');
  });

  it('switches to English when user selects EN', async () => {
    const user = userEvent.setup();
    renderSelector();
    const select = screen.getByRole('combobox', { name: /langue/i });

    await user.selectOptions(select, 'en');

    expect(select).toHaveValue('en');
    expect(localStorage.getItem('moviepicker-locale')).toBe('en');
  });

  it('displays both Français and English options', () => {
    renderSelector();
    expect(screen.getByRole('option', { name: 'Français' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
  });
});
