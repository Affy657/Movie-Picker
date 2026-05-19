import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './ThemeField.module.css';

export const THEME_EMOJIS = [
  '🎃',
  '😂',
  '🚀',
  '❤️',
  '🎬',
  '🕵️',
  '🧟',
  '🦸',
  '🎭',
  '🏃',
  '👻',
  '🎵',
  '🔥',
  '💀',
  '🤖',
  '🧙',
  '🐉',
  '🍿',
  '🎯',
  '🔮',
  '🌊',
  '⚡',
  '🎪',
  '🌈',
  '🎨',
  '👨‍👩‍👧',
  '🔍',
  '📜',
  '🤠',
  '🏆',
  '🧪',
  '🌌',
  '⭐',
  '🎞️',
  '🌙',
];

const PRESETS_VISIBLE = 5;

export const THEME_PRESETS = [
  { emoji: '🎃', text: 'Horreur' },
  { emoji: '😂', text: 'Comédie' },
  { emoji: '🎨', text: 'Animation' },
  { emoji: '🚀', text: 'Sci-fi' },
  { emoji: '❤️', text: 'Romance' },
  { emoji: '🎬', text: 'Action' },
  { emoji: '🕵️', text: 'Thriller' },
  { emoji: '🧟', text: 'Zombie' },
  { emoji: '🦸', text: 'Super-héros' },
  { emoji: '🎭', text: 'Drame' },
  { emoji: '🏃', text: 'Aventure' },
  { emoji: '👻', text: 'Fantastique' },
  { emoji: '🎵', text: 'Musical' },
  { emoji: '👨‍👩‍👧', text: 'Famille' },
  { emoji: '🔍', text: 'Policier' },
  { emoji: '📜', text: 'Historique' },
  { emoji: '🤠', text: 'Western' },
  { emoji: '⭐', text: 'Classiques' },
];

export function parseTheme(s: string | null | undefined): { emoji: string; text: string } {
  const raw = (s ?? '').trim();
  if (!raw) return { emoji: '', text: '' };
  const spaceIdx = raw.indexOf(' ');
  if (spaceIdx > 0) {
    const maybeEmoji = raw.slice(0, spaceIdx);
    if ([...maybeEmoji].length <= 2 && (maybeEmoji.codePointAt(0) ?? 0) > 0x00ff) {
      return { emoji: maybeEmoji, text: raw.slice(spaceIdx + 1) };
    }
  }
  return { emoji: '', text: raw };
}

type ThemeFieldProps = {
  emoji: string;
  text: string;
  onEmojiChange: (e: string) => void;
  onTextChange: (t: string) => void;
  disabled?: boolean;
  textInputId?: string;
};

export default function ThemeField({
  emoji,
  text,
  onEmojiChange,
  onTextChange,
  disabled,
  textInputId,
}: ThemeFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [presetsExpanded, setPresetsExpanded] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [pickerOpen]);

  return (
    <>
      <div className={styles.inputRow}>
        <div className={styles.pickerWrap} ref={pickerRef}>
          <button
            type="button"
            className={styles.emojiBtn}
            onClick={() => setPickerOpen((o) => !o)}
            disabled={disabled}
            aria-label="Choisir un emoji"
            aria-expanded={pickerOpen}
          >
            {emoji || '🎬'}
          </button>
          {pickerOpen && (
            <div className={styles.emojiGrid} role="listbox" aria-label="Emojis">
              <button
                type="button"
                role="option"
                aria-selected={emoji === ''}
                aria-label="Sans emoji"
                className={clsx(
                  styles.emojiOpt,
                  styles.emojiOptNone,
                  emoji === '' && styles.emojiOptSelected
                )}
                onClick={() => {
                  onEmojiChange('');
                  setPickerOpen(false);
                }}
              >
                ✕
              </button>
              {THEME_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  role="option"
                  aria-selected={e === emoji}
                  className={clsx(styles.emojiOpt, e === emoji && styles.emojiOptSelected)}
                  onClick={() => {
                    onEmojiChange(e);
                    setPickerOpen(false);
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          id={textInputId}
          className={clsx('input', styles.textInput)}
          type="text"
          autoComplete="off"
          placeholder="Horreur, Comédie…"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      {!disabled && (
        <fieldset className={styles.presets}>
          <legend className={styles.presetsLegend}>Thèmes suggérés</legend>
          {(presetsExpanded ? THEME_PRESETS : THEME_PRESETS.slice(0, PRESETS_VISIBLE)).map((p) => (
            <button
              key={p.text}
              type="button"
              className={clsx(
                styles.presetChip,
                text === p.text && emoji === p.emoji && styles.presetChipActive
              )}
              onClick={() => {
                onEmojiChange(p.emoji);
                onTextChange(p.text);
              }}
            >
              {p.emoji} {p.text}
            </button>
          ))}
          <button
            type="button"
            className={styles.presetMore}
            onClick={() => setPresetsExpanded((v) => !v)}
            aria-expanded={presetsExpanded}
          >
            {presetsExpanded ? '↑' : '···'}
          </button>
        </fieldset>
      )}
    </>
  );
}
