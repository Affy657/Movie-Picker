import { useEffect, useId, useRef, useState } from 'react';
import { ChevronUp, MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useMenuHorizontalFit } from '@/shared/hooks/useMenuHorizontalFit';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { t as translate, SUPPORTED_LOCALES, useTranslation } from '@/shared/i18n';
import Chip from '@/shared/components/Chip';
import Sheet from '@/shared/components/Sheet';
import { ChoiceCard, ChoiceGroup } from '@/shared/components/ChoiceCard';
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

export const THEME_TEXT_MAX_LENGTH = 90;

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

const LATIN_1_LAST_CODE_POINT = 0x00ff;

const LEADING_EMOJI_SEQUENCE =
  /^(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}[\u{FE0F}\p{Emoji_Modifier}\u{E0020}-\u{E007F}]*(?:\u200D\p{Extended_Pictographic}[\u{FE0F}\p{Emoji_Modifier}\u{E0020}-\u{E007F}]*)*)(?=\s|$)/u;

function leadingEmojiOf(theme: string): string {
  const emoji = LEADING_EMOJI_SEQUENCE.exec(theme)?.[0] ?? '';
  return (emoji.codePointAt(0) ?? 0) > LATIN_1_LAST_CODE_POINT ? emoji : '';
}

export function parseTheme(s: string | null | undefined): { emoji: string; text: string } {
  const raw = (s ?? '').trim();
  const emoji = leadingEmojiOf(raw);
  return { emoji, text: raw.slice(emoji.length).trim() };
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
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiGridRef = useRef<HTMLDivElement>(null);
  const gridId = useId();
  const touchScreen = useMediaQuery('(pointer: coarse)');
  const fitLeft = useMenuHorizontalFit(pickerOpen && !touchScreen, pickerRef, emojiGridRef, 'left');

  useClickOutside(pickerRef, () => setPickerOpen(false), pickerOpen && !touchScreen, {
    returnFocusTo: emojiButtonRef,
  });

  useEffect(() => {
    if (!pickerOpen) return;
    emojiGridRef.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus();
  }, [pickerOpen]);

  const emojiGrid = (
    <ChoiceGroup
      id={gridId}
      value={emoji}
      onChange={onEmojiChange}
      onSelect={() => setPickerOpen(false)}
      ariaLabel={t('events.settings.emojiListLabel')}
      className={clsx(styles.emojiGrid, touchScreen && styles.emojiGridSheet)}
    >
      <ChoiceCard
        value=""
        layout="tile"
        ariaLabel={t('events.settings.emojiNoneLabel')}
        className={clsx(styles.emojiOpt, styles.emojiOptNone)}
      >
        ✕
      </ChoiceCard>
      {THEME_EMOJIS.map((e) => (
        <ChoiceCard key={e} value={e} layout="tile" className={styles.emojiOpt}>
          {e}
        </ChoiceCard>
      ))}
    </ChoiceGroup>
  );

  const hiddenPresetCount = THEME_PRESETS.length - PRESETS_VISIBLE;

  return (
    <>
      <div className={styles.inputRow}>
        <div className={styles.pickerWrap} ref={pickerRef}>
          <button
            ref={emojiButtonRef}
            type="button"
            className={styles.emojiBtn}
            onClick={() => setPickerOpen((o) => !o)}
            disabled={disabled}
            aria-label={t('events.settings.emojiPickerLabel')}
            aria-expanded={pickerOpen}
            aria-haspopup={touchScreen ? 'dialog' : undefined}
            aria-controls={pickerOpen ? gridId : undefined}
          >
            {emoji || '🎬'}
          </button>
          {pickerOpen && !touchScreen && (
            <div
              ref={emojiGridRef}
              className={styles.emojiPopover}
              style={fitLeft !== null ? { left: fitLeft } : undefined}
            >
              {emojiGrid}
            </div>
          )}
          {touchScreen && (
            <Sheet
              open={pickerOpen}
              title={t('events.settings.emojiPickerLabel')}
              onClose={() => setPickerOpen(false)}
            >
              <div ref={emojiGridRef}>{emojiGrid}</div>
            </Sheet>
          )}
        </div>
        <input
          id={textInputId}
          className={clsx('input', styles.textInput)}
          type="text"
          autoComplete="off"
          maxLength={THEME_TEXT_MAX_LENGTH}
          placeholder={t('events.settings.themeFieldPlaceholder')}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      {!disabled && (
        <fieldset className={styles.presets}>
          <legend className="visually-hidden">{t('events.settings.themePresetsLegend')}</legend>
          {(presetsExpanded ? THEME_PRESETS : THEME_PRESETS.slice(0, PRESETS_VISIBLE)).map((p) => {
            const presetText = t(`events.settings.themePresets.${p.slug}`);
            return (
              <Chip
                key={p.slug}
                selected={isPresetSelected(p.slug, p.emoji, emoji, text)}
                onClick={() => {
                  onEmojiChange(p.emoji);
                  onTextChange(presetText);
                }}
              >
                {p.emoji} {presetText}
              </Chip>
            );
          })}
          <Chip
            tone="muted"
            icon={presetsExpanded ? ChevronUp : MoreHorizontal}
            onClick={() => setPresetsExpanded((v) => !v)}
          >
            {presetsExpanded
              ? t('events.settings.themePresetsLess')
              : t('events.settings.themePresetsMoreCount', { count: hiddenPresetCount })}
          </Chip>
        </fieldset>
      )}
    </>
  );
}
