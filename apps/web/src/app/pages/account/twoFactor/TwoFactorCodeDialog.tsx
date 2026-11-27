import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { deleteTwoFactor, postTwoFactorBackupCodes } from '@/features/auth/api/twoFactorApi';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import { ModalActions } from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Field from '@/shared/components/Field';
import BackupCodesPanel from './BackupCodesPanel';
import styles from './TwoFactor.module.css';

export type TwoFactorCodeAction = 'disable' | 'regenerate';

type TwoFactorCodeDialogProps = {
  action: TwoFactorCodeAction;
  onClose: () => void;
};

const COPY = {
  disable: {
    title: 'auth.twoFactor.disableTitle',
    intro: 'auth.twoFactor.disableIntro',
    label: 'auth.twoFactor.anyCodeLabel',
    submit: 'auth.twoFactor.disableSubmit',
    submitting: 'auth.twoFactor.disabling',
    fallback: 'auth.twoFactor.disableFallbackError',
  },
  regenerate: {
    title: 'auth.twoFactor.regenerateTitle',
    intro: 'auth.twoFactor.regenerateIntro',
    label: 'auth.twoFactor.confirmCodeLabel',
    submit: 'auth.twoFactor.regenerateSubmit',
    submitting: 'auth.twoFactor.regenerating',
    fallback: 'auth.twoFactor.regenerateFallbackError',
  },
} as const;

export default function TwoFactorCodeDialog({
  action,
  onClose,
}: Readonly<TwoFactorCodeDialogProps>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const copy = COPY[action];
  const [code, setCode] = useState('');
  const [newCodes, setNewCodes] = useState<string[] | null>(null);

  const submitAction = useCallback(async () => {
    if (action === 'disable') {
      await deleteTwoFactor(code.trim());
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      onClose();
      return;
    }
    setNewCodes(await postTwoFactorBackupCodes(code.trim()));
    void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  }, [action, code, queryClient, onClose]);

  const { run, loading, error, clearError } = useAsyncAction(submitAction, t(copy.fallback));

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    void run();
  };

  if (newCodes) {
    return (
      <ResponsiveDialog
        open
        title={t(copy.title)}
        onClose={onClose}
        footer={
          <ModalActions>
            <Button type="button" variant="primary" onClick={onClose}>
              {t('auth.twoFactor.codesDone')}
            </Button>
          </ModalActions>
        }
      >
        <BackupCodesPanel codes={newCodes} intro={t('auth.twoFactor.newCodesIntro')} />
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog
      open
      title={t(copy.title)}
      onClose={onClose}
      footer={
        <ModalActions>
          <Button type="button" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="two-factor-code"
            variant="primary"
            tone={action === 'disable' ? 'danger' : 'default'}
            loading={loading}
          >
            {loading ? t(copy.submitting) : t(copy.submit)}
          </Button>
        </ModalActions>
      }
    >
      <form
        id="two-factor-code"
        className={`form ${styles.stack}`}
        onSubmit={handleSubmit}
        noValidate
      >
        <p className={styles.intro}>{t(copy.intro)}</p>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <Field label={t(copy.label)} htmlFor="two-factor-code-input">
          {({ id }) => (
            <input
              id={id}
              className="input"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={12}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                clearError();
              }}
            />
          )}
        </Field>
      </form>
    </ResponsiveDialog>
  );
}
