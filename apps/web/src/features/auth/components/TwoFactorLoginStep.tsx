import { useCallback, useState } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { ApiError } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';
import { SUPPORT_EMAIL } from '@/shared/support/supportMailto';
import Button from '@/shared/components/Button';
import Field from '@/shared/components/Field';
import LinkButton from '@/shared/components/LinkButton';
import styles from './TwoFactorLoginStep.module.css';

const LOW_BACKUP_CODES = 3;

const REQUEST_ENDED_REASONS = new Set([
  'two_factor_challenge_expired',
  'two_factor_too_many_attempts',
]);

type CodeMode = 'app' | 'backup';

type TwoFactorLoginStepProps = {
  returnTo: string;
  onVerifying: () => void;
  onSignedIn: (backupCodesLeft: number | null) => void;
  onBack: () => void;
};

export default function TwoFactorLoginStep({
  returnTo,
  onVerifying,
  onSignedIn,
  onBack,
}: Readonly<TwoFactorLoginStepProps>) {
  const { t } = useTranslation();
  const { verifyTwoFactor } = useAuth();
  const [mode, setMode] = useState<CodeMode>('app');
  const [code, setCode] = useState('');
  const [missingCode, setMissingCode] = useState(false);
  const [requestEnded, setRequestEnded] = useState(false);

  const verifyAction = useCallback(async () => {
    onVerifying();
    try {
      const result = await verifyTwoFactor(code.trim(), returnTo);
      const runningLow = result.usedBackupCode && result.backupCodesRemaining < LOW_BACKUP_CODES;
      onSignedIn(runningLow ? result.backupCodesRemaining : null);
    } catch (error) {
      if (ApiError.is(error) && REQUEST_ENDED_REASONS.has(error.reason ?? ''))
        setRequestEnded(true);
      throw error;
    }
  }, [code, onSignedIn, onVerifying, returnTo, verifyTwoFactor]);

  const { run, loading, error, clearError } = useAsyncAction(
    verifyAction,
    t('auth.twoFactor.fallbackError')
  );

  const switchMode = () => {
    setMode((current) => (current === 'app' ? 'backup' : 'app'));
    setCode('');
    setMissingCode(false);
    clearError();
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!code.trim()) {
      setMissingCode(true);
      return;
    }
    void run();
  };

  if (requestEnded) {
    return (
      <div className="form">
        <p className="error" role="alert">
          {error}
        </p>
        <Button type="button" variant="primary" fullWidth onClick={onBack}>
          {t('auth.twoFactor.backToLogin')}
        </Button>
      </div>
    );
  }

  const isApp = mode === 'app';

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="form"
        noValidate
        aria-describedby={error ? 'two-factor-error' : undefined}
      >
        <p className="muted">
          {isApp ? t('auth.twoFactor.loginIntro') : t('auth.twoFactor.backupIntro')}
        </p>
        {error && (
          <p id="two-factor-error" className="error" role="alert">
            {error}
          </p>
        )}
        <Field
          label={isApp ? t('auth.twoFactor.appCodeLabel') : t('auth.twoFactor.backupCodeLabel')}
          htmlFor="two-factor-code"
          error={missingCode ? t('auth.twoFactor.codeRequired') : undefined}
        >
          {({ id, describedBy, invalid }) => (
            <input
              key={mode}
              id={id}
              className={`input ${styles.codeInput}`}
              inputMode={isApp ? 'numeric' : 'text'}
              autoComplete={isApp ? 'one-time-code' : 'off'}
              autoCapitalize={isApp ? 'off' : 'characters'}
              spellCheck={false}
              maxLength={isApp ? 9 : 12}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setMissingCode(false);
              }}
              autoFocus
              aria-describedby={describedBy}
              aria-invalid={invalid || error ? true : undefined}
            />
          )}
        </Field>
        <Button type="submit" variant="primary" fullWidth loading={loading}>
          {loading ? t('auth.twoFactor.verifying') : t('auth.twoFactor.verify')}
        </Button>
      </form>
      <p className="muted">
        {isApp ? `${t('auth.twoFactor.noPhone')} ` : null}
        <LinkButton onClick={switchMode}>
          {isApp ? t('auth.twoFactor.useBackupCode') : t('auth.twoFactor.useApp')}
        </LinkButton>
      </p>
      {isApp ? null : (
        <p className="muted">
          {t('auth.twoFactor.lostEverything')}{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{t('auth.twoFactor.writeToUs')}</a>{' '}
          {t('auth.twoFactor.fromAccountAddress')}
        </p>
      )}
      <p className="muted">
        <LinkButton onClick={onBack}>{t('auth.twoFactor.backToLogin')}</LinkButton>
      </p>
    </>
  );
}
