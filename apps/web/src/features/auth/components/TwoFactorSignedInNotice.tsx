import { useTranslation } from '@/shared/i18n';
import Button from '@/shared/components/Button';

type TwoFactorSignedInNoticeProps = {
  codesLeft: number;
  onContinue: () => void;
};

export default function TwoFactorSignedInNotice({
  codesLeft,
  onContinue,
}: Readonly<TwoFactorSignedInNoticeProps>) {
  const { t } = useTranslation();
  let message = t('auth.twoFactor.signedInFewCodes', { count: codesLeft });
  if (codesLeft === 0) message = t('auth.twoFactor.signedInNoCode');
  else if (codesLeft === 1) message = t('auth.twoFactor.signedInOneCode');

  return (
    <div className="form">
      <output>{message}</output>
      <Button type="button" variant="primary" fullWidth onClick={onContinue}>
        {t('auth.twoFactor.continue')}
      </Button>
    </div>
  );
}
