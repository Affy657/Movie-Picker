import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ChevronUp, MoreHorizontal } from 'lucide-react';
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

export const COLOR_SWATCHES: { label: string; hue: number }[] = [
  { label: 'Rouge', hue: 0 },
  { label: 'Orange', hue: 28 },
  { label: 'Jaune', hue: 52 },
  { label: 'Lime', hue: 90 },
  { label: 'Vert', hue: 135 },
  { label: 'Cyan', hue: 185 },
  { label: 'Bleu', hue: 220 },
  { label: 'Violet', hue: 268 },
  { label: 'Rose', hue: 320 },
];

type ThemeFieldProps = {
  emoji: string;
  text: string;
  themeColor: number | null;
  onEmojiChange: (e: string) => void;
  onTextChange: (t: string) => void;
  onThemeColorChange: (hue: number | null) => void;
  disabled?: boolean;
  textInputId?: string;
};

export default function ThemeField({
  emoji,
  text,
  themeColor,
  onEmojiChange,
  onTextChange,
  onThemeColorChange,
  disabled,
  textInputId,
}: Readonly<ThemeFieldProps>) {
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
            aria-label={presetsExpanded ? 'Moins de thèmes' : 'Plus de thèmes'}
            title={presetsExpanded ? 'Moins de thèmes' : 'Plus de thèmes'}
          >
            {presetsExpanded ? (
              <ChevronUp size={14} aria-hidden />
            ) : (
              <MoreHorizontal size={14} aria-hidden />
            )}
          </button>
        </fieldset>
      )}
      {!disabled && (
        <div className={styles.colorRow} role="group" aria-label="Couleur du tag">
          <span className={styles.colorRowLabel}>Couleur</span>
          <button
            type="button"
            className={clsx(
              styles.colorSwatch,
              styles.colorSwatchAuto,
              themeColor === null && styles.colorSwatchSelected
            )}
            onClick={() => onThemeColorChange(null)}
            aria-label="Automatique"
            aria-pressed={themeColor === null}
            title="Automatique"
          />
          {COLOR_SWATCHES.map((s) => (
            <button
              key={s.hue}
              type="button"
              className={clsx(
                styles.colorSwatch,
                themeColor === s.hue && styles.colorSwatchSelected
              )}
              style={{ '--swatch-hue': s.hue } as CSSProperties}
              onClick={() => onThemeColorChange(s.hue)}
              aria-label={s.label}
              aria-pressed={themeColor === s.hue}
              title={s.label}
            />
          ))}
        </div>
      )}
    </>
  );
}
