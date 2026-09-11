import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { getErrorMessage } from '@/shared/api/apiError';
import Toggle from '@/shared/components/Toggle';
import { ROUTES } from '@/app/routes';
import type { UserProfile } from '@/features/auth/types';
import AccountSavedChip from './AccountSavedChip';
import { useSavedFlash } from './useSavedFlash';
import styles from './AccountShared.module.css';

const BIO_MAX_LENGTH = 140;
const BIO_HINT_THRESHOLD = 20;
const AUTOSAVE_DELAY_MS = 800;

export default function AccountProfilePage({ user }: Readonly<{ user: UserProfile }>) {
  const { t } = useTranslation();
  const { patchProfile } = useAuth();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio ?? '');
  const [isPublic, setIsPublic] = useState(user.isProfilePublic ?? true);
  const [isWatchlistPublic, setIsWatchlistPublic] = useState(user.isWatchlistPublic ?? true);
  const [pseudoError, setPseudoError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, flashSaved] = useSavedFlash();
  const timerRef = useRef<number | undefined>(undefined);
  const savingRef = useRef(false);
  const pendingRetryRef = useRef(false);

  useEffect(() => {
    setDisplayName(user.displayName);
    setBio(user.bio ?? '');
    setIsPublic(user.isProfilePublic ?? true);
    setIsWatchlistPublic(user.isWatchlistPublic ?? true);
  }, [user]);

  useEffect(() => () => globalThis.clearTimeout(timerRef.current), []);

  const flush = useCallback(
    async (overrides: { isProfilePublic?: boolean; isWatchlistPublic?: boolean } = {}) => {
      globalThis.clearTimeout(timerRef.current);
      const trimmedName = displayName.trim();
      if (!trimmedName) {
        setPseudoError(t('auth.account.pseudoRequired'));
        return;
      }
      setPseudoError(null);

      const nextIsPublic = overrides.isProfilePublic ?? isPublic;
      const nextIsWatchlistPublic = overrides.isWatchlistPublic ?? isWatchlistPublic;
      const bioTrimmed = bio.trim();
      const bioChanged = bioTrimmed !== (user.bio?.trim() ?? '');
      const nameChanged = trimmedName !== user.displayName;
      const publicChanged = nextIsPublic !== (user.isProfilePublic ?? true);
      const watchlistChanged = nextIsWatchlistPublic !== (user.isWatchlistPublic ?? true);
      if (!nameChanged && !bioChanged && !publicChanged && !watchlistChanged) return;
      if (savingRef.current) {
        pendingRetryRef.current = true;
        return;
      }

      savingRef.current = true;
      try {
        setSaveError(null);
        await patchProfile({
          displayName: trimmedName,
          ...(bioChanged ? { bio: bioTrimmed === '' ? null : bioTrimmed } : {}),
          isProfilePublic: nextIsPublic,
          isWatchlistPublic: nextIsWatchlistPublic,
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.profile.public(user.handle) });
        flashSaved();
      } catch (err) {
        setSaveError(getErrorMessage(err, t('profile.settings.fallbackError')));
      } finally {
        savingRef.current = false;
        if (pendingRetryRef.current) {
          pendingRetryRef.current = false;
          void flush();
        }
      }
    },
    [displayName, bio, isPublic, isWatchlistPublic, user, patchProfile, queryClient, flashSaved, t]
  );

  const scheduleSave = () => {
    globalThis.clearTimeout(timerRef.current);
    timerRef.current = globalThis.setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
  };

  const bioCharsLeft = BIO_MAX_LENGTH - bio.length;
  const showBioHint = bioCharsLeft <= BIO_HINT_THRESHOLD;
  const errorMsg = pseudoError ?? saveError;
  const profileUrl = user.handle ? `movie-picker.fr${ROUTES.profile(user.handle)}` : '';
  const watchlistUrl = user.handle ? `movie-picker.fr${ROUTES.profileWatchlist(user.handle)}` : '';

  return (
    <>
      <div className={styles.panelHead}>
        <h2 id="account-profile-heading" className={styles.panelHeading}>
          {t('auth.account.profileTitle')}
        </h2>
        <AccountSavedChip visible={saved} />
      </div>

      {errorMsg && (
        <p id="profile-displayName-error" className="error" role="alert">
          {errorMsg}
        </p>
      )}

      <div className={styles.card}>
        <div className={styles.field}>
          <label className="label" htmlFor="profile-displayName">
            {t('auth.account.pseudoLabel')}
          </label>
          <input
            id="profile-displayName"
            type="text"
            className="input"
            autoComplete="nickname"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              scheduleSave();
            }}
            onBlur={() => void flush()}
            required
            maxLength={80}
            aria-describedby={pseudoError ? 'profile-displayName-error' : undefined}
          />
        </div>

        <div className={styles.field}>
          <label className="label" htmlFor="profile-bio">
            {t('profile.settings.bioLabel')}
          </label>
          <textarea
            id="profile-bio"
            className="input"
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              scheduleSave();
            }}
            onBlur={() => void flush()}
            maxLength={BIO_MAX_LENGTH}
            rows={2}
            aria-describedby={showBioHint ? 'profile-bio-hint' : undefined}
          />
          {showBioHint && (
            <p id="profile-bio-hint" className="hint" aria-live="polite">
              {t('profile.settings.bioHint', { count: String(bioCharsLeft) })}
            </p>
          )}
        </div>

        <div className={styles.row} style={{ borderTop: 'none', paddingTop: 0 }}>
          <div className={styles.rowMain}>
            <p className={styles.rowLabel}>{t('profile.settings.visibilityLabel')}</p>
            {profileUrl && (
              <p className={styles.rowSub}>
                {t('auth.account.profileVisibilityHint', { url: profileUrl })}
              </p>
            )}
          </div>
          <Toggle
            checked={isPublic}
            label={t('profile.settings.visibilityLabel')}
            onChange={() => {
              const next = !isPublic;
              setIsPublic(next);
              void flush({ isProfilePublic: next });
            }}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.rowMain}>
            <p className={styles.rowLabel}>{t('profile.settings.watchlistVisibilityLabel')}</p>
            <p className={styles.rowSub}>
              {isPublic
                ? t('profile.settings.watchlistVisibilityHint', { url: watchlistUrl })
                : t('profile.settings.watchlistVisibilityPrivateHint')}
            </p>
          </div>
          <Toggle
            checked={isWatchlistPublic}
            disabled={!isPublic}
            label={t('profile.settings.watchlistVisibilityLabel')}
            onChange={() => {
              const next = !isWatchlistPublic;
              setIsWatchlistPublic(next);
              void flush({ isWatchlistPublic: next });
            }}
          />
        </div>
      </div>
    </>
  );
}
