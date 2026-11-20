import { useEffect, useId, useState } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTranslation } from '@/shared/i18n';
import { getErrorMessage } from '@/shared/api/apiError';
import Button from '@/shared/components/Button';
import Field from '@/shared/components/Field';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { fetchHandleAvailability } from '@/features/profile/api/profileApi';
import type { UserProfile } from '@/features/auth/types';
import styles from './ProfileEditHandle.module.css';

const CHECK_DELAY_MS = 400;

type Verdict =
  { handle: string; state: 'available' } | { handle: string; state: 'refused'; message: string };

type Shown = { state: 'idle' } | { state: 'checking' } | Verdict;

function normalize(raw: string): string {
  return raw.trim().toLowerCase();
}

export default function ProfileEditHandle({
  user,
  onSaved,
}: Readonly<{ user: UserProfile; onSaved: () => void }>) {
  const { t } = useTranslation();
  const { patchProfile } = useAuth();
  const statusId = useId();
  const [value, setValue] = useState(user.handle);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [saving, setSaving] = useState(false);
  const wanted = normalize(value);
  const isCurrent = wanted === user.handle;

  useEffect(() => {
    if (isCurrent) return;
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => {
      fetchHandleAvailability(wanted, controller.signal)
        .then((answer) =>
          setVerdict(
            answer.available
              ? { handle: wanted, state: 'available' }
              : { handle: wanted, state: 'refused', message: t('apiErrors.handle_taken') }
          )
        )
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setVerdict({
            handle: wanted,
            state: 'refused',
            message: getErrorMessage(err, t('profile.settings.fallbackError')),
          });
        });
    }, CHECK_DELAY_MS);
    return () => {
      globalThis.clearTimeout(timer);
      controller.abort();
    };
  }, [wanted, isCurrent, t]);

  let shown: Shown = { state: 'idle' };
  if (!isCurrent) shown = verdict?.handle === wanted ? verdict : { state: 'checking' };

  const take = async () => {
    setSaving(true);
    try {
      const updated = await patchProfile({ handle: wanted });
      setValue(updated.handle);
      setVerdict(null);
      onSaved();
    } catch (err) {
      setVerdict({
        handle: wanted,
        state: 'refused',
        message: getErrorMessage(err, t('profile.settings.fallbackError')),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Field label={t('profile.edit.handle')} htmlFor="profile-handle">
        {({ id }) => (
          <div className={styles.inputWrap}>
            <span className={styles.at} aria-hidden="true">
              @
            </span>
            <input
              id={id}
              type="text"
              className={clsx('input', styles.input)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={20}
              aria-describedby={statusId}
            />
          </div>
        )}
      </Field>
      <div id={statusId} className={styles.status} aria-live="polite">
        {shown.state === 'checking' && (
          <span className={styles.muted}>{t('profile.edit.handleChecking')}</span>
        )}
        {shown.state === 'available' && (
          <>
            <span className={styles.available}>
              <Check size={ICON_SIZE.sm} aria-hidden />
              {t('profile.edit.handleAvailable')}
            </span>
            <Button size="sm" onClick={() => void take()} loading={saving}>
              {t('profile.edit.handleUse')}
            </Button>
            <p className={clsx('hint', styles.warning)}>{t('profile.edit.handleWarning')}</p>
          </>
        )}
        {shown.state === 'refused' && <span className={styles.refused}>{shown.message}</span>}
      </div>
    </div>
  );
}
