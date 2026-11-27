import { useTranslation } from '@/shared/i18n';
import { useCopyFeedback } from '@/shared/hooks/useCopyFeedback';
import Button from '@/shared/components/Button';
import styles from './TwoFactor.module.css';

const KEY_GROUP = /.{1,4}/g;

function groupedKey(key: string): string {
  return (key.match(KEY_GROUP) ?? []).join(' ');
}

export default function ManualKey({ manualKey }: Readonly<{ manualKey: string }>) {
  const { t } = useTranslation();
  const { copied, copy } = useCopyFeedback();

  return (
    <div className={styles.key}>
      <code className={styles.keyValue}>{groupedKey(manualKey)}</code>
      <Button type="button" size="sm" onClick={() => void copy(manualKey)}>
        {copied ? t('auth.twoFactor.copied') : t('auth.twoFactor.copy')}
      </Button>
    </div>
  );
}
