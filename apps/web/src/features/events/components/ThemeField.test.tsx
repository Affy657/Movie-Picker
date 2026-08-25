import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeField, { parseTheme } from './ThemeField';

function renderField(
  overrides: Partial<{
    emoji: string;
    text: string;
    themeColor: number | null;
    disabled: boolean;
  }> = {}
) {
  const onEmojiChange = vi.fn();
  const onTextChange = vi.fn();
  const onThemeColorChange = vi.fn();
  render(
    <ThemeField
      emoji={overrides.emoji ?? ''}
      text={overrides.text ?? ''}
      themeColor={overrides.themeColor ?? null}
      onEmojiChange={onEmojiChange}
      onTextChange={onTextChange}
      onThemeColorChange={onThemeColorChange}
      disabled={overrides.disabled}
    />
  );
  return { onEmojiChange, onTextChange, onThemeColorChange };
}

describe('parseTheme', () => {
  it('retourne vide pour une chaîne vide', () => {
    expect(parseTheme('')).toEqual({ emoji: '', text: '' });
    expect(parseTheme(null)).toEqual({ emoji: '', text: '' });
  });

  it('sépare un emoji suivi du texte', () => {
    expect(parseTheme('🎃 Horreur')).toEqual({ emoji: '🎃', text: 'Horreur' });
  });

  it('traite un texte sans emoji', () => {
    expect(parseTheme('Comédie')).toEqual({ emoji: '', text: 'Comédie' });
  });
});

describe('ThemeField', () => {
  it('ouvre le sélecteur d’emoji et applique un preset', async () => {
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

  it('déplie les thèmes et choisit une couleur', async () => {
    const user = userEvent.setup();
    const { onThemeColorChange } = renderField({ emoji: '🎃', text: 'Horreur' });

    expect(screen.queryByRole('button', { name: /western/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Plus de thèmes' }));
    expect(screen.getByRole('button', { name: /western/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Rouge' }));
    expect(onThemeColorChange).toHaveBeenCalledWith(0);
  });

  it('masque presets et couleurs quand disabled', () => {
    renderField({ disabled: true });
    expect(screen.queryByText('Thèmes suggérés')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Couleur du tag' })).not.toBeInTheDocument();
  });
});
