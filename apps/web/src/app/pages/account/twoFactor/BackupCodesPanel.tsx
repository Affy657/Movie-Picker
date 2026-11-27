import { useTranslation } from '@/shared/i18n';
import { useCopyFeedback } from '@/shared/hooks/useCopyFeedback';
import { downloadBlob } from '@/shared/utils/downloadBlob';
import Button from '@/shared/components/Button';
import styles from './TwoFactor.module.css';

type BackupCodesPanelProps = {
  codes: readonly string[];
  intro: string;
};

export default function BackupCodesPanel({ codes, intro }: Readonly<BackupCodesPanelProps>) {
  const { t } = useTranslation();
  const { copied, copy } = useCopyFeedback();
  const asText = codes.join('\n');

  const download = () => {
    const text = `${t('auth.twoFactor.codesFileHeader')}\n\n${asText}\n`;
    downloadBlob(new Blob([text], { type: 'text/plain' }), t('auth.twoFactor.codesFileName'));
  };

  return (
    <div className={styles.stack}>
      <p className={styles.intro}>{intro}</p>
      <ul className={styles.codes}>
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <p className={styles.warning}>{t('auth.twoFactor.codesWarning')}</p>
      <div className={styles.inlineActions}>
        <Button type="button" size="sm" onClick={() => void copy(asText)}>
          {copied ? t('auth.twoFactor.copied') : t('auth.twoFactor.copy')}
        </Button>
        <Button type="button" size="sm" onClick={download}>
          {t('auth.twoFactor.download')}
        </Button>
      </div>
    </div>
  );
}
