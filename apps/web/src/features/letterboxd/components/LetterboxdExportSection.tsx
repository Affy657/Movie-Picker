import { lazy, Suspense, useState } from 'react';
import { FileUp } from 'lucide-react';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';
import sharedStyles from '@/shared/components/SettingsSection.module.css';
import { useTranslation } from '@/shared/i18n';

const LetterboxdExportDialog = lazy(
  () => import('@/features/letterboxd/components/LetterboxdExportDialog')
);

export default function LetterboxdExportSection() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Card padding="none" elevation="sm" className={sharedStyles.card}>
      <p className={sharedStyles.cardTitle}>
        <span>{t('auth.account.letterboxd.export.cardTitle')}</span>
      </p>
      <div className={`${sharedStyles.row} ${sharedStyles.noDivider}`}>
        <FileUp size={ICON_SIZE.xl} aria-hidden className={sharedStyles.rowIcon} />
        <div className={sharedStyles.rowMain}>
          <p className={sharedStyles.rowLabel}>{t('auth.account.letterboxd.export.rowLabel')}</p>
          <p className={sharedStyles.rowSub}>{t('auth.account.letterboxd.export.rowHint')}</p>
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          {t('auth.account.letterboxd.export.open')}
        </Button>
      </div>
      {open && (
        <Suspense fallback={null}>
          <LetterboxdExportDialog onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </Card>
  );
}
