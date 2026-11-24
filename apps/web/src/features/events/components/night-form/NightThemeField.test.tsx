import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import NightThemeField from './NightThemeField';

function Harness({
  initial = { emoji: '', text: '' },
}: Readonly<{ initial?: { emoji: string; text: string } }>) {
  const [theme, setTheme] = useState(initial);
  return (
    <LocaleProvider>
      <NightThemeField
        inputId="theme"
        emoji={theme.emoji}
        text={theme.text}
        onChange={(emoji, text) => setTheme({ emoji, text })}
      />
      <p data-testid="theme">{`${theme.emoji}|${theme.text}`}</p>
    </LocaleProvider>
  );
}

describe('NightThemeField', () => {
  afterEach(() => {
    localStorage.removeItem('moviepicker-locale');
  });

  it('offers five moods and « Autre »', () => {
    stubMatchMedia(false);
    render(<Harness />);

    expect(screen.getByRole('button', { name: /horreur/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: /romance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Autre' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('recognises a mood saved in the other language', () => {
    stubMatchMedia(false);
    localStorage.setItem('moviepicker-locale', 'en');
    render(<Harness initial={{ emoji: '🎃', text: 'Horreur' }} />);

    expect(screen.getByRole('button', { name: /horror/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the other moods in a panel that the mood picked closes', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Autre' }));
    const others = screen.getByRole('group', { name: 'Autres ambiances' });
    await user.click(within(others).getByRole('button', { name: /western/i }));

    expect(screen.getByTestId('theme')).toHaveTextContent('🤠|Western');
    expect(screen.queryByRole('group', { name: 'Autres ambiances' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /western/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('gives the focus back to its chip when Escape closes the panel', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Autre' }));
    await user.type(screen.getByRole('textbox', { name: 'Thème' }), 'Nanars');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('group', { name: 'Autres ambiances' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nanars/i })).toHaveFocus();
  });

  it('closes the emoji grid alone on Escape, then the panel', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Autre' }));
    await user.click(screen.getByRole('button', { name: 'Choisir un emoji' }));
    expect(screen.getByRole('radiogroup', { name: 'Emojis' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('radiogroup', { name: 'Emojis' })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Autres ambiances' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choisir un emoji' })).toHaveFocus();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('group', { name: 'Autres ambiances' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Autre' })).toHaveFocus();
  });

  it('opens a sheet on a phone and applies the mood only once validated', async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Autre' }));
    const sheet = screen.getByRole('dialog', { name: 'Ambiance' });
    await user.type(within(sheet).getByRole('textbox', { name: 'Thème' }), 'Nanars');

    expect(screen.getByTestId('theme')).toHaveTextContent('|');
    await user.click(within(sheet).getByRole('button', { name: 'Valider' }));

    expect(screen.getByTestId('theme')).toHaveTextContent('|Nanars');
  });
});
