import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { ChevronUp, MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { fitMenuVertically, type MenuPlacement } from '@/shared/hooks/useMenuVerticalFit';
import { t as translate, SUPPORTED_LOCALES, useTranslation } from '@/shared/i18n';
import Chip from '@/shared/components/Chip';
import Sheet from '@/shared/components/Sheet';
import { ChoiceCard, ChoiceGroup } from '@/shared/components/ChoiceCard';
import { MENU_ANCHOR_GAP_PX, MENU_VIEWPORT_MARGIN_PX } from '@/shared/components/menuGeometry';
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

type PopoverPosition = {
  top: number;
  left: number;
  maxHeight: number | null;
  placement: MenuPlacement;
};

function popoverPositionFor(trigger: HTMLElement, panel: HTMLElement): PopoverPosition {
  const anchor = trigger.getBoundingClientRect();
  const left = Math.max(
    MENU_VIEWPORT_MARGIN_PX,
    Math.min(anchor.left, globalThis.innerWidth - panel.offsetWidth - MENU_VIEWPORT_MARGIN_PX)
  );
  const contentHeight = panel.scrollHeight;
  const { placement, maxHeight } = fitMenuVertically(anchor, contentHeight, globalThis.innerHeight);
  const top =
    placement === 'top'
      ? Math.max(
          MENU_VIEWPORT_MARGIN_PX,
          anchor.top - MENU_ANCHOR_GAP_PX - (maxHeight ?? contentHeight)
        )
      : anchor.bottom + MENU_ANCHOR_GAP_PX;
  return { top, left, maxHeight, placement };
}

function popoverStyle(position: PopoverPosition | null): CSSProperties | undefined {
  if (position === null) return undefined;
  const { top, left, maxHeight } = position;
  return maxHeight === null ? { top, left } : { top, left, maxHeight };
}

function useFixedPopover(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>
): PopoverPosition | null {
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    setPosition(popoverPositionFor(trigger, panel));
  }, [triggerRef, panelRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    globalThis.addEventListener('resize', place);
    globalThis.addEventListener('scroll', place, true);
    return () => {
      globalThis.removeEventListener('resize', place);
      globalThis.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  return position;
}

type ThemeFieldProps = {
  emoji: string;
  text: string;
  onEmojiChange: (e: string) => void;
  onTextChange: (t: string) => void;
  disabled?: boolean;
  textInputId?: string;
  showPresets?: boolean;
};

export default function ThemeField({
  emoji,
  text,
  onEmojiChange,
  onTextChange,
  disabled,
  textInputId,
  showPresets = true,
}: Readonly<ThemeFieldProps>) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [presetsExpanded, setPresetsExpanded] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiGridRef = useRef<HTMLDivElement>(null);
  const gridId = useId();
  const isMobile = useIsMobile();
  const popoverOpen = pickerOpen && !isMobile;
  const position = useFixedPopover(popoverOpen, emojiButtonRef, emojiGridRef);

  useClickOutside(pickerRef, () => setPickerOpen(false), popoverOpen, {
    returnFocusTo: emojiButtonRef,
    closeOnFocusLeave: true,
  });

  useEffect(() => {
    if (!pickerOpen) return;
    emojiGridRef.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus();
  }, [pickerOpen]);

  const closeAfterPick = () => {
    setPickerOpen(false);
    emojiButtonRef.current?.focus();
  };

  const emojiGrid = (
    <ChoiceGroup
      id={gridId}
      value={emoji}
      onChange={onEmojiChange}
      onSelect={closeAfterPick}
      ariaLabel={t('events.settings.emojiListLabel')}
      className={clsx(styles.emojiGrid, isMobile && styles.emojiGridSheet)}
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
            aria-haspopup={isMobile ? 'dialog' : undefined}
            aria-controls={pickerOpen ? gridId : undefined}
          >
            {emoji || '🎬'}
          </button>
          {popoverOpen && (
            <div
              ref={emojiGridRef}
              className={styles.emojiPopover}
              data-placement={position?.placement}
              style={popoverStyle(position)}
            >
              {emojiGrid}
            </div>
          )}
          {isMobile && (
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
      {!disabled && showPresets && (
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
