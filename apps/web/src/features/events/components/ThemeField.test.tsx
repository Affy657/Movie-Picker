import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import ThemeField, { parseTheme, THEME_PRESETS } from './ThemeField';

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
    expect(screen.getByRole('radiogroup', { name: 'Emojis' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Sans emoji' }));
    expect(onEmojiChange).toHaveBeenCalledWith('');
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /horreur/i }));
    expect(onEmojiChange).toHaveBeenCalledWith('🎃');
    expect(onTextChange).toHaveBeenCalledWith('Horreur');
  });

  it('walks the emojis with the arrows without closing, and closes on Escape', async () => {
    const user = userEvent.setup();
    const { onEmojiChange } = renderField({ emoji: '🎃' });

    const opener = screen.getByRole('button', { name: 'Choisir un emoji' });
    await user.click(opener);
    expect(screen.getByRole('radio', { name: '🎃' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(onEmojiChange).toHaveBeenLastCalledWith('😂');
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('unfolds the list of suggested themes, counting the hidden ones', async () => {
    const user = userEvent.setup();
    renderField({ emoji: '🎃', text: 'Horreur' });

    expect(screen.queryByRole('button', { name: /western/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: `${THEME_PRESETS.length - 5} de plus` }));
    expect(screen.getByRole('button', { name: /western/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Moins de thèmes' }));
    expect(screen.queryByRole('button', { name: /western/i })).not.toBeInTheDocument();
  });

  it('names the grid it opens', async () => {
    const user = userEvent.setup();
    renderField();

    const opener = screen.getByRole('button', { name: 'Choisir un emoji' });
    expect(opener).not.toHaveAttribute('aria-controls');
    await user.click(opener);
    const grid = screen.getByRole('radiogroup', { name: 'Emojis' });
    expect(opener).toHaveAttribute('aria-controls', grid.id);
  });

  describe('on a touch screen', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('opens the emojis in a bottom sheet instead of a popover', async () => {
      stubMatchMedia((query) => query.includes('pointer: coarse'));
      const user = userEvent.setup();
      const { onEmojiChange } = renderField();

      await user.click(screen.getByRole('button', { name: 'Choisir un emoji' }));
      const sheet = screen.getByRole('dialog', { name: 'Choisir un emoji' });
      expect(sheet).toBeInTheDocument();
      await user.click(screen.getByRole('radio', { name: '🎃' }));

      expect(onEmojiChange).toHaveBeenCalledWith('🎃');
      expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    });
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
