import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import Button from '@/shared/components/Button';
import Chip from '@/shared/components/Chip';
import Sheet from '@/shared/components/Sheet';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { fixedPopoverStyle, useFixedPopover } from '@/shared/hooks/useFixedPopover';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation, type Translate } from '@/shared/i18n';
import ThemeField, { isPresetTheme, THEME_PRESETS } from '@/features/events/components/ThemeField';
import styles from './NightForm.module.css';

const QUICK_PRESET_COUNT = 5;
const QUICK_PRESETS = THEME_PRESETS.slice(0, QUICK_PRESET_COUNT);
const MORE_PRESETS = THEME_PRESETS.slice(QUICK_PRESET_COUNT);

type Preset = (typeof THEME_PRESETS)[number];
type Theme = { emoji: string; text: string };

const NO_THEME: Theme = { emoji: '', text: '' };

function presetTheme(preset: Preset, t: Translate): Theme {
  return { emoji: preset.emoji, text: t(`events.settings.themePresets.${preset.slug}`) };
}

function isPreset(preset: Preset, theme: Theme): boolean {
  return isPresetTheme(preset, theme.emoji, theme.text);
}

function hasTheme(theme: Theme): boolean {
  return theme.emoji !== '' || theme.text.trim() !== '';
}

type ThemePanelProps = {
  inputId: string;
  theme: Theme;
  onTheme: (theme: Theme) => void;
  onPresetPicked?: () => void;
};

function ThemePanelBody({ inputId, theme, onTheme, onPresetPicked }: Readonly<ThemePanelProps>) {
  const { t } = useTranslation();
  return (
    <>
      <div className={styles.chips} role="group" aria-label={t('events.form.moreThemes')}>
        {MORE_PRESETS.map((preset) => {
          const selected = isPreset(preset, theme);
          const next = presetTheme(preset, t);
          return (
            <Chip
              key={preset.slug}
              size="md"
              selected={selected}
              onClick={() => {
                onTheme(selected ? NO_THEME : next);
                onPresetPicked?.();
              }}
            >
              {next.emoji} {next.text}
            </Chip>
          );
        })}
      </div>
      <hr className={styles.separator} />
      <div>
        <label className="visually-hidden" htmlFor={inputId}>
          {t('events.create.themeLabel')}
        </label>
        <ThemeField
          textInputId={inputId}
          emoji={theme.emoji}
          text={theme.text}
          onEmojiChange={(emoji) => onTheme({ ...theme, emoji })}
          onTextChange={(text) => onTheme({ ...theme, text })}
        />
      </div>
    </>
  );
}

type NightThemeFieldProps = {
  inputId: string;
  emoji: string;
  text: string;
  onChange: (emoji: string, text: string) => void;
  disabled?: boolean;
};

export default function NightThemeField({
  inputId,
  emoji,
  text,
  onChange,
  disabled = false,
}: Readonly<NightThemeFieldProps>) {
  const { t } = useTranslation();
  const headingId = useId();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Theme>(NO_THEME);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [chipRef] = useState<RefObject<HTMLElement | null>>(() => ({
    get current() {
      return anchorRef.current?.querySelector('button') ?? null;
    },
  }));
  const popoverOpen = open && !isMobile;
  const position = useFixedPopover(popoverOpen, anchorRef, panelRef);
  const theme: Theme = { emoji, text };

  useClickOutside([anchorRef, panelRef], () => setOpen(false), popoverOpen, {
    returnFocusTo: chipRef,
    closeOnFocusLeave: true,
  });

  useEffect(() => {
    if (popoverOpen) document.getElementById(inputId)?.focus();
  }, [popoverOpen, inputId]);

  const quickSelected = QUICK_PRESETS.find((preset) => isPreset(preset, theme));
  const custom = hasTheme(theme) && !quickSelected;
  const apply = (next: Theme) => onChange(next.emoji, next.text);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setDraft(theme);
    setOpen(true);
  };

  return (
    <section className={styles.block} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.blockTitle}>
        {t('events.create.themeSectionLabel')}
      </h3>
      <div className={styles.chips}>
        {QUICK_PRESETS.map((preset) => {
          const selected = quickSelected?.slug === preset.slug;
          const next = presetTheme(preset, t);
          return (
            <Chip
              key={preset.slug}
              size="md"
              selected={selected}
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                apply(selected ? NO_THEME : next);
              }}
            >
              {next.emoji} {next.text}
            </Chip>
          );
        })}
        <span ref={anchorRef} className={styles.chips}>
          <Chip size="md" selected={custom} expanded={open} disabled={disabled} onClick={toggle}>
            {custom ? `${emoji} ${text}`.trim() : t('events.form.themeOther')}
          </Chip>
        </span>
      </div>
      {popoverOpen ? (
        <div
          ref={panelRef}
          className={styles.themePanel}
          data-placement={position?.placement}
          style={fixedPopoverStyle(position)}
        >
          <ThemePanelBody
            inputId={inputId}
            theme={theme}
            onTheme={apply}
            onPresetPicked={() => setOpen(false)}
          />
        </div>
      ) : null}
      {isMobile ? (
        <Sheet
          open={open}
          title={t('events.create.themeSectionLabel')}
          onClose={() => setOpen(false)}
          footer={
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                apply(draft);
                setOpen(false);
              }}
            >
              {t('events.form.confirm')}
            </Button>
          }
        >
          <div className={styles.themeSheet}>
            <ThemePanelBody inputId={inputId} theme={draft} onTheme={setDraft} />
          </div>
        </Sheet>
      ) : null}
    </section>
  );
}
