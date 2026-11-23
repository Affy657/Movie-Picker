import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTranslation } from '@/shared/i18n';
import { getErrorMessage } from '@/shared/api/apiError';
import BackLink from '@/shared/components/BackLink';
import Field from '@/shared/components/Field';
import PageLayout from '@/shared/components/PageLayout';
import Toggle from '@/shared/components/Toggle';
import AccentColorPicker from '@/app/components/AccentColorPicker';
import type { UserProfile } from '@/features/auth/types';
import { ownProfileDestination } from '@/features/auth/utils/ownProfileDestination';
import AccountSavedChip from './AccountSavedChip';
import ProfileEditFavorites from './ProfileEditFavorites';
import ProfileEditHandle from './ProfileEditHandle';
import ProfileEditPreview from './ProfileEditPreview';
import ProfileEditSection from './ProfileEditSection';
import { useSavedFlash } from './useSavedFlash';
import { forgetProfileDraft, keepProfileDraft, readProfileDraft } from './profileDraftStorage';
import styles from './ProfileEditPage.module.css';

const BIO_MAX_LENGTH = 140;
const BIO_HINT_THRESHOLD = 20;
const AUTOSAVE_DELAY_MS = 800;
const COLOR_ANCHOR = 'couleur';

type ProfileDraft = {
  displayName: string;
  bio: string;
  isPublic: boolean;
};

function draftOf(user: UserProfile): ProfileDraft {
  return {
    displayName: user.displayName,
    bio: user.bio ?? '',
    isPublic: user.isProfilePublic ?? true,
  };
}

function withUnsavedText(server: ProfileDraft, userId: string): ProfileDraft {
  const unsaved = readProfileDraft(userId);
  return unsaved ? { ...server, ...unsaved } : server;
}

function sameDraft(a: ProfileDraft, b: ProfileDraft): boolean {
  return a.displayName === b.displayName && a.bio === b.bio && a.isPublic === b.isPublic;
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
  };
}

function useAnchorScroll(anchor: string) {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === `#${anchor}`) document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
  }, [hash, anchor]);
}

export default function ProfileEditPage({ user }: Readonly<{ user: UserProfile }>) {
  const { t } = useTranslation();
  const { patchProfile } = useAuth();
  const colorLabelId = useId();
  useAnchorScroll(COLOR_ANCHOR);

  const [draft, setDraft] = useState(() => withUnsavedText(draftOf(user), user.userId));
  const draftRef = useRef(draft);
  const serverDraftRef = useRef(draftOf(user));
  const restoredDraftRef = useRef(!sameDraft(draft, serverDraftRef.current));
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, flashSaved] = useSavedFlash();
  const timerRef = useRef<number | undefined>(undefined);
  const savingRef = useRef(false);
  const pendingRetryRef = useRef(false);

  const replaceDraft = useCallback((next: ProfileDraft) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const editDraft = (edit: Partial<ProfileDraft>) => {
    const next = { ...draftRef.current, ...edit };
    replaceDraft(next);
    keepProfileDraft(user.userId, next);
  };

  useEffect(() => {
    const incoming = draftOf(user);
    const merged = keepUnsavedEdits(draftRef.current, serverDraftRef.current, incoming);
    serverDraftRef.current = incoming;
    if (!sameDraft(merged, draftRef.current)) replaceDraft(merged);
  }, [user, replaceDraft]);

  useEffect(() => () => globalThis.clearTimeout(timerRef.current), []);

  const flush = useCallback(async () => {
    globalThis.clearTimeout(timerRef.current);
    const sent = draftRef.current;
    const trimmedName = sent.displayName.trim();
    if (!trimmedName) {
      setNameError(t('profile.edit.nameRequired'));
      return;
    }
    setNameError(null);

    const server = serverDraftRef.current;
    const bioTrimmed = sent.bio.trim();
    const bioChanged = bioTrimmed !== server.bio.trim();
    const nameChanged = trimmedName !== server.displayName;
    const publicChanged = sent.isPublic !== server.isPublic;
    if (!nameChanged && !bioChanged && !publicChanged) return;
    if (savingRef.current) {
      pendingRetryRef.current = true;
      return;
    }

    savingRef.current = true;
    try {
      setSaveError(null);
      const updated = await patchProfile({
        displayName: trimmedName,
        ...(bioChanged ? { bio: bioTrimmed } : {}),
        isProfilePublic: sent.isPublic,
      });
      serverDraftRef.current = draftOf(updated);
      if (sameDraft(draftRef.current, sent)) {
        replaceDraft(serverDraftRef.current);
        forgetProfileDraft();
      }
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
  }, [patchProfile, flashSaved, t, replaceDraft]);

  useEffect(() => {
    if (!restoredDraftRef.current) return;
    restoredDraftRef.current = false;
    void flush();
  }, [flush]);

  const scheduleSave = () => {
    globalThis.clearTimeout(timerRef.current);
    timerRef.current = globalThis.setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
  };

  const { displayName, bio, isPublic } = draft;
  const bioCharsLeft = BIO_MAX_LENGTH - bio.length;
  const showBioHint = bioCharsLeft <= BIO_HINT_THRESHOLD;
  const errorMsg = nameError ?? saveError;

  return (
    <PageLayout className={styles.page}>
      <div className={styles.topBar}>
        <BackLink to={ownProfileDestination(user).path}>{t('profile.edit.back')}</BackLink>
        <AccountSavedChip visible={saved} />
      </div>
      <h1 className="visually-hidden">{t('profile.edit.title')}</h1>

      <ProfileEditPreview user={user} displayName={displayName} bio={bio} onSaved={flashSaved} />

      {errorMsg && (
        <p id="profile-displayName-error" className="error" role="alert">
          {errorMsg}
        </p>
      )}

      <div className={styles.sections}>
        <ProfileEditSection title={t('profile.edit.identity')}>
          <div className={styles.identityRow}>
            <Field label={t('profile.edit.name')} htmlFor="profile-displayName">
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
                  aria-describedby={nameError ? 'profile-displayName-error' : undefined}
                />
              )}
            </Field>
            <ProfileEditHandle user={user} onSaved={flashSaved} />
          </div>
          <div>
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
        </ProfileEditSection>

        <ProfileEditSection
          id={COLOR_ANCHOR}
          labelId={colorLabelId}
          title={t('profile.edit.color')}
        >
          <AccentColorPicker
            id="profile-color"
            ariaLabelledBy={colorLabelId}
            onSaved={flashSaved}
          />
        </ProfileEditSection>

        <ProfileEditFavorites user={user} onSaved={flashSaved} />

        <ProfileEditSection title={t('profile.edit.visibility')}>
          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>{t('profile.settings.visibilityLabel')}</span>
            <Toggle
              checked={isPublic}
              ariaLabel={t('profile.settings.visibilityLabel')}
              onChange={(checked) => {
                editDraft({ isPublic: checked });
                void flush();
              }}
            />
          </div>
        </ProfileEditSection>
      </div>
    </PageLayout>
  );
}
