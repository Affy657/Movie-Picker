import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  postTwoFactorEnable,
  postTwoFactorSetup,
  type TwoFactorSetup,
} from '@/features/auth/api/twoFactorApi';
import { ApiError } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import { ModalActions } from '@/shared/components/Modal';
import Button, { buttonClass } from '@/shared/components/Button';
import Field from '@/shared/components/Field';
import QrCode from '@/shared/components/QrCode';
import BackupCodesPanel from './BackupCodesPanel';
import ManualKey from './ManualKey';
import styles from './TwoFactor.module.css';

type SetupStep = 1 | 2 | 3;

type TwoFactorSetupDialogProps = {
  hasPassword: boolean;
  onClose: () => void;
};

function ScanStep({ setup }: Readonly<{ setup: TwoFactorSetup }>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className={styles.stack}>
        <a href={setup.otpauthUri} className={buttonClass({ variant: 'primary', fullWidth: true })}>
          {t('auth.twoFactor.openApp')}
        </a>
        <p className={styles.intro}>{t('auth.twoFactor.manualKeyIntroMobile')}</p>
        <ManualKey manualKey={setup.manualKey} />
        <p className={styles.warning}>{t('auth.twoFactor.otherDeviceHint')}</p>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <p className={styles.intro}>{t('auth.twoFactor.scanIntro')}</p>
      <QrCode
        value={setup.otpauthUri}
        title={t('auth.twoFactor.qrAlt')}
        plain
        className={styles.qr}
      />
      <p className={styles.intro}>{t('auth.twoFactor.manualKeyIntro')}</p>
      <ManualKey manualKey={setup.manualKey} />
    </div>
  );
}

function ScanBody({
  setup,
  loadError,
}: Readonly<{ setup: TwoFactorSetup | null; loadError: string | null }>) {
  const { t } = useTranslation();
  if (loadError) {
    return (
      <p className="error" role="alert">
        {loadError}
      </p>
    );
  }
  if (!setup) {
    return (
      <p className="placeholder" aria-busy="true">
        {t('auth.twoFactor.setupLoading')}
      </p>
    );
  }
  return <ScanStep setup={setup} />;
}

type ConfirmStepProps = {
  hasPassword: boolean;
  code: string;
  currentPassword: string;
  error: string | null;
  onCodeChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
};

function ConfirmStep({
  hasPassword,
  code,
  currentPassword,
  error,
  onCodeChange,
  onPasswordChange,
  onSubmit,
}: Readonly<ConfirmStepProps>) {
  const { t } = useTranslation();
  return (
    <form id="two-factor-enable" className="form" onSubmit={onSubmit} noValidate>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <Field
        label={t('auth.twoFactor.confirmCodeLabel')}
        htmlFor="two-factor-enable-code"
        hint={t('auth.twoFactor.confirmCodeHint')}
      >
        {({ id, describedBy }) => (
          <input
            id={id}
            className="input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={9}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      {hasPassword ? (
        <Field
          label={t('auth.twoFactor.currentPasswordLabel')}
          htmlFor="two-factor-enable-password"
        >
          {({ id }) => (
            <input
              id={id}
              type="password"
              className="input"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => onPasswordChange(e.target.value)}
            />
          )}
        </Field>
      ) : null}
    </form>
  );
}

export default function TwoFactorSetupDialog({
  hasPassword,
  onClose,
}: Readonly<TwoFactorSetupDialogProps>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<SetupStep>(1);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const loadAction = useCallback(async () => setSetup(await postTwoFactorSetup()), []);
  const { run: load, error: loadError } = useAsyncAction(
    loadAction,
    t('auth.twoFactor.setupFailed')
  );

  useEffect(() => {
    void load();
  }, [load]);

  const enableAction = useCallback(async () => {
    if (!setup) return;
    try {
      const codes = await postTwoFactorEnable({
        setupToken: setup.setupToken,
        code: code.trim(),
        currentPassword: hasPassword ? currentPassword : undefined,
      });
      setBackupCodes(codes);
      setStep(3);
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    } catch (error) {
      if (ApiError.is(error) && error.reason === 'two_factor_code_invalid') {
        throw new Error(t('auth.twoFactor.setupCodeInvalid'), { cause: error });
      }
      throw error;
    }
  }, [setup, code, hasPassword, currentPassword, queryClient, t]);

  const {
    run: enable,
    loading: enabling,
    error: enableError,
    clearError,
  } = useAsyncAction(enableAction, t('auth.twoFactor.enableFallbackError'));

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    void enable();
  };

  const titles: Record<SetupStep, string> = {
    1: t('auth.twoFactor.setupTitle'),
    2: t('auth.twoFactor.setupTitle'),
    3: t('auth.twoFactor.codesTitle'),
  };

  const footers: Record<SetupStep, React.ReactNode> = {
    1: (
      <ModalActions>
        {isMobile ? null : (
          <Button type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        )}
        <Button type="button" variant="primary" disabled={!setup} onClick={() => setStep(2)}>
          {isMobile ? t('auth.twoFactor.keyAdded') : t('auth.twoFactor.continue')}
        </Button>
      </ModalActions>
    ),
    2: (
      <ModalActions>
        <Button
          type="button"
          disabled={enabling}
          onClick={() => {
            clearError();
            setStep(1);
          }}
        >
          {t('auth.twoFactor.back')}
        </Button>
        <Button type="submit" form="two-factor-enable" variant="primary" loading={enabling}>
          {enabling ? t('auth.twoFactor.enabling') : t('auth.twoFactor.enableSubmit')}
        </Button>
      </ModalActions>
    ),
    3: (
      <ModalActions>
        <Button type="button" variant="primary" onClick={onClose}>
          {t('auth.twoFactor.codesDone')}
        </Button>
      </ModalActions>
    ),
  };

  return (
    <ResponsiveDialog open title={titles[step]} onClose={onClose} footer={footers[step]}>
      <div className={styles.stack}>
        {step < 3 ? <p className={styles.step}>{t('auth.twoFactor.step', { step })}</p> : null}
        {step === 1 ? <ScanBody setup={setup} loadError={loadError} /> : null}
        {step === 2 ? (
          <ConfirmStep
            hasPassword={hasPassword}
            code={code}
            currentPassword={currentPassword}
            error={enableError}
            onCodeChange={(value) => {
              setCode(value);
              clearError();
            }}
            onPasswordChange={(value) => {
              setCurrentPassword(value);
              clearError();
            }}
            onSubmit={handleSubmit}
          />
        ) : null}
        {step === 3 ? (
          <BackupCodesPanel codes={backupCodes} intro={t('auth.twoFactor.codesIntro')} />
        ) : null}
      </div>
    </ResponsiveDialog>
  );
}
