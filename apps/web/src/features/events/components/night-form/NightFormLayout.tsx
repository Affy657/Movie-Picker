import { useId, type ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import Button from '@/shared/components/Button';
import Sheet from '@/shared/components/Sheet';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import styles from './NightForm.module.css';

type NightFormLayoutProps = {
  main: ReactNode;
  mainEnd?: ReactNode;
  rules: ReactNode;
  rulesSummary: string;
  rulesError?: string;
  rulesOpen: boolean;
  onRulesOpenChange: (open: boolean) => void;
};

export function useNightFormBodyClass(): string | undefined {
  return useIsMobile() ? undefined : styles.wideBody;
}

export default function NightFormLayout({
  main,
  mainEnd,
  rules,
  rulesSummary,
  rulesError,
  rulesOpen,
  onRulesOpenChange,
}: Readonly<NightFormLayoutProps>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const rulesErrorId = useId();

  if (!isMobile) {
    return (
      <div className={styles.columns}>
        <div className={styles.column}>
          <div className={styles.stack}>
            {main}
            {mainEnd}
          </div>
        </div>
        <div className={styles.column}>{rules}</div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.stack}>
        {main}
        <div className={styles.rulesBlock}>
          <button
            type="button"
            className={clsx(styles.rulesRow, rulesError && styles.rulesRowInvalid)}
            aria-haspopup="dialog"
            aria-describedby={rulesError ? rulesErrorId : undefined}
            onClick={() => onRulesOpenChange(true)}
          >
            <span className={styles.blockTitle}>{t('events.form.rules')}</span>{' '}
            <span className={styles.rulesRowValue}>{rulesSummary}</span>
            <ChevronRight size={ICON_SIZE.md} aria-hidden className={styles.rulesRowIcon} />
          </button>
          {rulesError ? (
            <p id={rulesErrorId} className={styles.rulesRowError}>
              {rulesError}
            </p>
          ) : null}
        </div>
        {mainEnd}
      </div>
      <Sheet
        open={rulesOpen}
        title={t('events.form.rules')}
        size="lg"
        onClose={() => onRulesOpenChange(false)}
        footer={
          <Button variant="primary" fullWidth onClick={() => onRulesOpenChange(false)}>
            {t('events.create.rules.done')}
          </Button>
        }
      >
        {rules}
      </Sheet>
    </>
  );
}
