import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import type { UserProfile } from '@/features/auth/types';
import { useTranslation } from '@/shared/i18n';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import sharedStyles from '@/shared/components/SettingsSection.module.css';
import TwoFactorCodeDialog, { type TwoFactorCodeAction } from './TwoFactorCodeDialog';
import TwoFactorSetupDialog from './TwoFactorSetupDialog';
import styles from './TwoFactor.module.css';

const LOW_BACKUP_CODES_WARNING = 2;

type OpenDialog = 'setup' | TwoFactorCodeAction | null;

function OnHint({ remaining }: Readonly<{ remaining: number }>) {
  const { t } = useTranslation();
  if (remaining === 0) return <>{t('auth.twoFactor.onHintNone')}</>;
  if (remaining === 1) return <>{t('auth.twoFactor.onHintOne')}</>;
  return <>{t('auth.twoFactor.onHint', { count: remaining })}</>;
}

export default function TwoFactorRow({ user }: Readonly<{ user: UserProfile }>) {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const enabled = user.twoFactorEnabled;
  const runningLow = enabled && user.backupCodesRemaining <= LOW_BACKUP_CODES_WARNING;
  const close = () => setDialog(null);

  return (
    <div className={sharedStyles.row}>
      <ShieldCheck size={ICON_SIZE.xl} aria-hidden className={sharedStyles.rowIcon} />
      <div className={sharedStyles.rowMain}>
        <p className={sharedStyles.rowLabel}>{t('auth.twoFactor.rowLabel')}</p>
        <p className={sharedStyles.rowSub}>
          <span className={styles.status}>
            {enabled ? t('auth.twoFactor.statusOn') : t('auth.twoFactor.statusOff')}
          </span>
          {'. '}
          {enabled ? <OnHint remaining={user.backupCodesRemaining} /> : t('auth.twoFactor.offHint')}
        </p>
        {runningLow ? (
          <p className={clsx(sharedStyles.rowSub, styles.lowCodes)}>
            {t('auth.twoFactor.lowCodes')}
          </p>
        ) : null}
      </div>
      {enabled ? (
        <div className={styles.rowActions}>
          <Button type="button" onClick={() => setDialog('regenerate')}>
            {t('auth.twoFactor.regenerate')}
          </Button>
          <Button type="button" tone="danger" onClick={() => setDialog('disable')}>
            {t('auth.twoFactor.disable')}
          </Button>
        </div>
      ) : (
        <Button type="button" onClick={() => setDialog('setup')}>
          {t('auth.twoFactor.enable')}
        </Button>
      )}
      {dialog === 'setup' ? (
        <TwoFactorSetupDialog hasPassword={user.hasPassword} onClose={close} />
      ) : null}
      {dialog === 'disable' || dialog === 'regenerate' ? (
        <TwoFactorCodeDialog action={dialog} onClose={close} />
      ) : null}
    </div>
  );
}
