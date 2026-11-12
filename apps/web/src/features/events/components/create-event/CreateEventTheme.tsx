import { useEffect, useId, useRef, useState } from 'react';
import Chip from '@/shared/components/Chip';
import Field from '@/shared/components/Field';
import { useTranslation } from '@/shared/i18n';
import ThemeField, { THEME_PRESETS } from '@/features/events/components/ThemeField';
import styles from './CreateEventDialog.module.css';

const QUICK_PRESETS = THEME_PRESETS.slice(0, 5);
const THEME_INPUT_ID = 'create-theme';

type CreateEventThemeProps = {
  emoji: string;
  text: string;
  onChange: (emoji: string, text: string) => void;
};

export default function CreateEventTheme({
  emoji,
  text,
  onChange,
}: Readonly<CreateEventThemeProps>) {
  const { t } = useTranslation();
  const headingId = useId();
  const [freeOpen, setFreeOpen] = useState(false);
  const wasFreeOpen = useRef(freeOpen);
  useEffect(() => {
    if (freeOpen && !wasFreeOpen.current) document.getElementById(THEME_INPUT_ID)?.focus();
    wasFreeOpen.current = freeOpen;
  }, [freeOpen]);

  const presets = QUICK_PRESETS.map((preset) => ({
    ...preset,
    label: t(`events.settings.themePresets.${preset.slug}`),
  }));
  const selectedPreset = presets.find((preset) => preset.emoji === emoji && preset.label === text);
  const hasTheme = emoji !== '' || text.trim() !== '';
  const showFreeField = freeOpen || (hasTheme && !selectedPreset);

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.sectionTitle}>
        {t('events.create.themeSectionLabel')}
        <span className={styles.optional}>{t('events.create.optional')}</span>
      </h3>
      <div className={styles.chips}>
        {presets.map((preset) => {
          const selected = selectedPreset?.slug === preset.slug;
          return (
            <Chip
              key={preset.slug}
              size="md"
              selected={selected}
              onClick={() => {
                setFreeOpen(false);
                if (selected) onChange('', '');
                else onChange(preset.emoji, preset.label);
              }}
            >
              {preset.emoji} {preset.label}
            </Chip>
          );
        })}
        <Chip
          size="md"
          tone="muted"
          selected={showFreeField}
          onClick={() => {
            if (showFreeField) {
              onChange('', '');
              setFreeOpen(false);
              return;
            }
            if (selectedPreset) onChange('', '');
            setFreeOpen(true);
          }}
        >
          {t('events.create.themeOther')}
        </Chip>
      </div>
      {showFreeField ? (
        <Field
          label={t('events.create.themeLabel')}
          htmlFor={THEME_INPUT_ID}
          className={styles.inlineField}
        >
          {({ id }) => (
            <ThemeField
              textInputId={id}
              emoji={emoji}
              text={text}
              onEmojiChange={(next) => onChange(next, text)}
              onTextChange={(next) => onChange(emoji, next)}
              showPresets={false}
            />
          )}
        </Field>
      ) : null}
    </section>
  );
}
