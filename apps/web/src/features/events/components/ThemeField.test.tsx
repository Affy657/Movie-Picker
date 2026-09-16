import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import ThemeField, { parseTheme } from './ThemeField';

function renderField(
  overrides: Partial<{
    emoji: string;
    text: string;
    disabled: boolean;
  }> = {}
) {
  const onEmojiChange = vi.fn();
  const onTextChange = vi.fn();
  render(
    <LocaleProvider>
      <ThemeField
        emoji={overrides.emoji ?? ''}
        text={overrides.text ?? ''}
        onEmojiChange={onEmojiChange}
        onTextChange={onTextChange}
        disabled={overrides.disabled}
      />
    </LocaleProvider>
  );
  return { onEmojiChange, onTextChange };
}

describe('parseTheme', () => {
  it('returns empty for an empty string', () => {
    expect(parseTheme('')).toEqual({ emoji: '', text: '' });
    expect(parseTheme(null)).toEqual({ emoji: '', text: '' });
  });

  it('separates an emoji followed by text', () => {
    expect(parseTheme('🎃 Horreur')).toEqual({ emoji: '🎃', text: 'Horreur' });
  });

  it('traite un texte sans emoji', () => {
    expect(parseTheme('Comédie')).toEqual({ emoji: '', text: 'Comédie' });
  });
});

describe('ThemeField', () => {
  it('opens the emoji picker and applies a preset', async () => {
    const user = userEvent.setup();
    const { onEmojiChange, onTextChange } = renderField();

    await user.click(screen.getByRole('button', { name: 'Choisir un emoji' }));
    expect(screen.getByRole('listbox', { name: 'Emojis' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Sans emoji' }));
    expect(onEmojiChange).toHaveBeenCalledWith('');

    await user.click(screen.getByRole('button', { name: /horreur/i }));
    expect(onEmojiChange).toHaveBeenCalledWith('🎃');
    expect(onTextChange).toHaveBeenCalledWith('Horreur');
  });

  it('unfolds the list of suggested themes', async () => {
    const user = userEvent.setup();
    renderField({ emoji: '🎃', text: 'Horreur' });

    expect(screen.queryByRole('button', { name: /western/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Plus de thèmes' }));
    expect(screen.getByRole('button', { name: /western/i })).toBeInTheDocument();
  });

  it('hides the suggested themes when disabled', () => {
    renderField({ disabled: true });
    expect(screen.queryByText('Thèmes suggérés')).not.toBeInTheDocument();
  });

  it('recognises a theme saved in the other language', () => {
    localStorage.setItem('moviepicker-locale', 'en');
    renderField({ emoji: '🎃', text: 'Horreur' });
    expect(screen.getByRole('button', { name: /horror/i })).toHaveAttribute('aria-pressed', 'true');
  });
});
