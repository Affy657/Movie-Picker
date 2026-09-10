import clsx from 'clsx';
import { ChevronDown, Sparkles, X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import ThemeField from './ThemeField';
import styles from './HostEventSettingsPanel.module.css';

type Props = {
  emoji: string;
  text: string;
  preview: string;
  open: boolean;
  collapseId: string;
  onToggle: () => void;
  onEmojiChange: (value: string) => void;
  onTextChange: (value: string) => void;
  onClear: () => void;
};

function badge(emoji: string, preview: string) {
  if (emoji) return emoji;
  return preview ? '🎬' : <Sparkles size={18} />;
}

export default function HostEventThemeField({
  emoji,
  text,
  preview,
  open,
  collapseId,
  onToggle,
  onEmojiChange,
  onTextChange,
  onClear,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div className={styles.field}>
      <div className={clsx(styles.themeCard, open && styles.themeCardOpen)}>
        <button
          type="button"
          className={styles.themeTrigger}
          aria-expanded={open}
          aria-controls={collapseId}
          onClick={onToggle}
        >
          <span className={styles.themeBadge} aria-hidden>
            {badge(emoji, preview)}
          </span>
          <span className={styles.themeInfo}>
            <span className={styles.themeTitle}>
              {preview || t('events.settings.themeEmptyTitle')}
            </span>
            <span className={styles.themeSubtitle}>
              {preview ? t('events.settings.themeLabel') : t('events.settings.themeEmptySubtitle')}
            </span>
          </span>
          <ChevronDown size={18} aria-hidden className={styles.themeChevron} />
        </button>
        {open && (
          <div id={collapseId} className={styles.themeExpanded}>
            {preview && (
              <button
                type="button"
                className={styles.clearThemeBtn}
                onClick={onClear}
                aria-label={t('events.settings.clearThemeAria')}
              >
                <X size={11} strokeWidth={2.5} />
                <span>{t('events.settings.clearThemeButton')}</span>
              </button>
            )}
            <ThemeField
              textInputId="host-cfg-theme"
              emoji={emoji}
              text={text}
              onEmojiChange={onEmojiChange}
              onTextChange={onTextChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
