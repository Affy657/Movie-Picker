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
  it('renders a dropdown with FR selected by default', () => {
    renderSelector();
    const trigger = screen.getByRole('button', { name: /langue/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Français');
  });

  it('switches to English when user selects EN', async () => {
    const user = userEvent.setup();
    renderSelector();
    const trigger = screen.getByRole('button', { name: /langue/i });

    await user.click(trigger);
    const englishOption = screen.getByRole('option', { name: /english/i });
    await user.click(englishOption);

    expect(trigger).toHaveTextContent('English');
    expect(localStorage.getItem('moviepicker-locale')).toBe('en');
  });

  it('displays both Français and English options when opened', async () => {
    const user = userEvent.setup();
    renderSelector();
    const trigger = screen.getByRole('button', { name: /langue/i });
    await user.click(trigger);
    expect(screen.getByRole('option', { name: 'Français' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
  });
});
