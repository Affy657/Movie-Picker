import { useCallback, useEffect, useRef, useState } from 'react';
import Card from '@/shared/components/Card';
import clsx from 'clsx';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTranslation } from '@/shared/i18n';
import { getErrorMessage } from '@/shared/api/apiError';
import Toggle from '@/shared/components/Toggle';
import { ROUTES } from '@/app/routes';
import type { UserProfile } from '@/features/auth/types';
import AccountSavedChip from './AccountSavedChip';
import { useSavedFlash } from './useSavedFlash';
import styles from '@/shared/components/SettingsSection.module.css';
import Field from '@/shared/components/Field';

const BIO_MAX_LENGTH = 140;
const BIO_HINT_THRESHOLD = 20;
const AUTOSAVE_DELAY_MS = 800;

type ProfileDraft = {
  displayName: string;
  bio: string;
  isPublic: boolean;
  isWatchlistPublic: boolean;
};

function draftOf(user: UserProfile): ProfileDraft {
  return {
    displayName: user.displayName,
    bio: user.bio ?? '',
    isPublic: user.isProfilePublic ?? true,
    isWatchlistPublic: user.isWatchlistPublic ?? true,
  };
}

function sameDraft(a: ProfileDraft, b: ProfileDraft): boolean {
  return (
    a.displayName === b.displayName &&
    a.bio === b.bio &&
    a.isPublic === b.isPublic &&
    a.isWatchlistPublic === b.isWatchlistPublic
  );
}

function unlessEdited<T>(draftValue: T, serverValue: T, incomingValue: T): T {
  return draftValue === serverValue ? incomingValue : draftValue;
}

function keepUnsavedEdits(
  draft: ProfileDraft,
  server: ProfileDraft,
  incoming: ProfileDraft
): ProfileDraft {
  return {
    displayName: unlessEdited(draft.displayName, server.displayName, incoming.displayName),
    bio: unlessEdited(draft.bio, server.bio, incoming.bio),
    isPublic: unlessEdited(draft.isPublic, server.isPublic, incoming.isPublic),
    isWatchlistPublic: unlessEdited(
      draft.isWatchlistPublic,
      server.isWatchlistPublic,
      incoming.isWatchlistPublic
    ),
  };
}

export default function AccountProfilePage({ user }: Readonly<{ user: UserProfile }>) {
  const { t } = useTranslation();
  const { patchProfile } = useAuth();

  const [draft, setDraftState] = useState(() => draftOf(user));
  const draftRef = useRef(draft);
  const serverDraftRef = useRef(draft);
  const [pseudoError, setPseudoError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, flashSaved] = useSavedFlash();
  const timerRef = useRef<number | undefined>(undefined);
  const savingRef = useRef(false);
  const pendingRetryRef = useRef(false);

  const setDraft = useCallback((next: ProfileDraft) => {
    draftRef.current = next;
    setDraftState(next);
  }, []);

  const editDraft = (edit: Partial<ProfileDraft>) => setDraft({ ...draftRef.current, ...edit });

  useEffect(() => {
    const incoming = draftOf(user);
    const merged = keepUnsavedEdits(draftRef.current, serverDraftRef.current, incoming);
    serverDraftRef.current = incoming;
    if (!sameDraft(merged, draftRef.current)) setDraft(merged);
  }, [user, setDraft]);

  useEffect(() => () => globalThis.clearTimeout(timerRef.current), []);

  const flush = useCallback(async () => {
    globalThis.clearTimeout(timerRef.current);
    const sent = draftRef.current;
    const trimmedName = sent.displayName.trim();
    if (!trimmedName) {
      setPseudoError(t('auth.account.pseudoRequired'));
      return;
    }
    setPseudoError(null);

    const server = serverDraftRef.current;
    const bioTrimmed = sent.bio.trim();
    const bioChanged = bioTrimmed !== server.bio.trim();
    const nameChanged = trimmedName !== server.displayName;
    const publicChanged = sent.isPublic !== server.isPublic;
    const watchlistChanged = sent.isWatchlistPublic !== server.isWatchlistPublic;
    if (!nameChanged && !bioChanged && !publicChanged && !watchlistChanged) return;
    if (savingRef.current) {
      pendingRetryRef.current = true;
      return;
    }

    savingRef.current = true;
    try {
      setSaveError(null);
      const updated = await patchProfile({
        displayName: trimmedName,
        ...(bioChanged ? { bio: bioTrimmed === '' ? null : bioTrimmed } : {}),
        isProfilePublic: sent.isPublic,
        isWatchlistPublic: sent.isWatchlistPublic,
      });
      serverDraftRef.current = draftOf(updated);
      if (sameDraft(draftRef.current, sent)) setDraft(serverDraftRef.current);
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
  }, [patchProfile, flashSaved, t, setDraft]);

  const scheduleSave = () => {
    globalThis.clearTimeout(timerRef.current);
    timerRef.current = globalThis.setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
  };

  const { displayName, bio, isPublic, isWatchlistPublic } = draft;
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

      <Card padding="none" elevation="sm" className={styles.card}>
        <div className={styles.field}>
          <Field label={t('auth.account.pseudoLabel')} htmlFor="profile-displayName">
            {({ id }) => (
              <input
                id={id}
                type="text"
                className="input"
                autoComplete="nickname"
                value={displayName}
                onChange={(e) => {
                  editDraft({ displayName: e.target.value });
                  scheduleSave();
                }}
                onBlur={() => void flush()}
                required
                maxLength={80}
                aria-describedby={pseudoError ? 'profile-displayName-error' : undefined}
              />
            )}
          </Field>
        </div>

        <div className={styles.field}>
          <Field label={t('profile.settings.bioLabel')} htmlFor="profile-bio">
            {({ id }) => (
              <textarea
                id={id}
                className="input"
                value={bio}
                onChange={(e) => {
                  editDraft({ bio: e.target.value });
                  scheduleSave();
                }}
                onBlur={() => void flush()}
                maxLength={BIO_MAX_LENGTH}
                rows={2}
                aria-describedby={showBioHint ? 'profile-bio-hint' : undefined}
              />
            )}
          </Field>
          {showBioHint && (
            <p id="profile-bio-hint" className="hint" aria-live="polite">
              {t('profile.settings.bioHint', { count: String(bioCharsLeft) })}
            </p>
          )}
        </div>

        <div className={clsx(styles.row, styles.noDivider, styles.rowFlush)}>
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
            ariaLabel={t('profile.settings.visibilityLabel')}
            onChange={(checked) => {
              editDraft({ isPublic: checked });
              void flush();
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
            ariaLabel={t('profile.settings.watchlistVisibilityLabel')}
            onChange={(checked) => {
              editDraft({ isWatchlistPublic: checked });
              void flush();
            }}
          />
        </div>
      </Card>
    </>
  );
}
