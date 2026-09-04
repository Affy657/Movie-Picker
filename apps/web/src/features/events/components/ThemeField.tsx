import { useEffect, useRef, useState } from 'react';
import { ChevronUp, MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { useMenuHorizontalFit } from '@/shared/hooks/useMenuHorizontalFit';
import { t as translate, SUPPORTED_LOCALES, useTranslation } from '@/shared/i18n';
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
  { emoji: '🎃', slug: 'horror' },
  { emoji: '😂', slug: 'comedy' },
  { emoji: '🎨', slug: 'animation' },
  { emoji: '🚀', slug: 'scifi' },
  { emoji: '❤️', slug: 'romance' },
  { emoji: '🎬', slug: 'action' },
  { emoji: '🕵️', slug: 'thriller' },
  { emoji: '🧟', slug: 'zombie' },
  { emoji: '🦸', slug: 'superhero' },
  { emoji: '🎭', slug: 'drama' },
  { emoji: '🏃', slug: 'adventure' },
  { emoji: '👻', slug: 'fantasy' },
  { emoji: '🎵', slug: 'musical' },
  { emoji: '👨‍👩‍👧', slug: 'family' },
  { emoji: '🔍', slug: 'crime' },
  { emoji: '📜', slug: 'history' },
  { emoji: '🤠', slug: 'western' },
  { emoji: '⭐', slug: 'classics' },
] as const;

function isPresetSelected(
  slug: (typeof THEME_PRESETS)[number]['slug'],
  presetEmoji: string,
  emoji: string,
  text: string
): boolean {
  if (emoji !== presetEmoji) return false;
  return SUPPORTED_LOCALES.some(
    (locale) => translate(`events.settings.themePresets.${slug}`, undefined, locale) === text
  );
}

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
}: Readonly<ThemeFieldProps>) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [presetsExpanded, setPresetsExpanded] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const emojiGridRef = useRef<HTMLDivElement>(null);
  const fitLeft = useMenuHorizontalFit(pickerOpen, pickerRef, emojiGridRef, 'left');

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
            aria-label={t('events.settings.emojiPickerLabel')}
            aria-expanded={pickerOpen}
          >
            {emoji || '🎬'}
          </button>
          {pickerOpen && (
            <div
              ref={emojiGridRef}
              className={styles.emojiGrid}
              role="listbox"
              aria-label={t('events.settings.emojiListLabel')}
              style={fitLeft !== null ? { left: fitLeft } : undefined}
            >
              <button
                type="button"
                role="option"
                aria-selected={emoji === ''}
                aria-label={t('events.settings.emojiNoneLabel')}
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
          placeholder={t('events.settings.themeFieldPlaceholder')}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      {!disabled && (
        <fieldset className={styles.presets}>
          <legend className={styles.presetsLegend}>
            {t('events.settings.themePresetsLegend')}
          </legend>
          {(presetsExpanded ? THEME_PRESETS : THEME_PRESETS.slice(0, PRESETS_VISIBLE)).map((p) => {
            const presetText = t(`events.settings.themePresets.${p.slug}`);
            return (
              <button
                key={p.slug}
                type="button"
                className={clsx(
                  styles.presetChip,
                  isPresetSelected(p.slug, p.emoji, emoji, text) && styles.presetChipActive
                )}
                onClick={() => {
                  onEmojiChange(p.emoji);
                  onTextChange(presetText);
                }}
              >
                {p.emoji} {presetText}
              </button>
            );
          })}
          <button
            type="button"
            className={styles.presetMore}
            onClick={() => setPresetsExpanded((v) => !v)}
            aria-expanded={presetsExpanded}
            aria-label={t(
              presetsExpanded
                ? 'events.settings.themePresetsLess'
                : 'events.settings.themePresetsMore'
            )}
            title={t(
              presetsExpanded
                ? 'events.settings.themePresetsLess'
                : 'events.settings.themePresetsMore'
            )}
          >
            {presetsExpanded ? (
              <ChevronUp size={14} aria-hidden />
            ) : (
              <MoreHorizontal size={14} aria-hidden />
            )}
          </button>
        </fieldset>
      )}
    </>
  );
}
