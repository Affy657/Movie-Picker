import { useCallback, useEffect, useRef, useState } from 'react';
import { Globe, Pencil, User } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import Avatar from '@/shared/components/Avatar';
import AvatarPickerModal from '@/features/auth/components/AvatarPickerModal';
import styles from '@/features/auth/pages/AccountPage.module.css';

const BIO_MAX_LENGTH = 140;
const BIO_HINT_THRESHOLD = 20;
const SAVE_FEEDBACK_MS = 2500;

export default function PublicProfileSection() {
  const { t } = useTranslation();
  const { user, patchProfile } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const savedTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setBio(user.bio ?? '');
    setIsPublic(user.isProfilePublic ?? true);
  }, [user]);

  useEffect(() => {
    if (savedAt === null) return;
    window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => setSavedAt(null), SAVE_FEEDBACK_MS);
    return () => window.clearTimeout(savedTimerRef.current);
  }, [savedAt]);

  const saveAction = useCallback(async () => {
    if (!user) return;
    await patchProfile({
      displayName: displayName.trim(),
      bio: bio.trim() === '' ? null : bio.trim(),
      isProfilePublic: isPublic,
    });
    setSavedAt(Date.now());
  }, [user, patchProfile, displayName, bio, isPublic]);

  const {
    run: runSave,
    loading: saving,
    error,
  } = useAsyncAction(saveAction, t('profile.settings.fallbackError'));

  if (!user) return null;

  const bioCharsLeft = BIO_MAX_LENGTH - bio.length;
  const showBioHint = bioCharsLeft <= BIO_HINT_THRESHOLD;

  return (
    <section className="section section--panel" aria-labelledby="profile-section-heading">
      <h2 id="profile-section-heading" className={styles.sectionTitle}>
        <User size={18} aria-hidden />
        {t('auth.account.profileTitle')}
      </h2>

      <div className={styles.avatarRow}>
        <button
          type="button"
          className={styles.avatarButton}
          onClick={() => setAvatarModalOpen(true)}
          aria-label={t('auth.account.avatarLabel')}
        >
          <Avatar avatarId={user.avatarId} size="lg" />
          <span className={styles.avatarEditOverlay} aria-hidden>
            <Pencil size={14} />
          </span>
        </button>
      </div>

      <AvatarPickerModal
        open={avatarModalOpen}
        currentAvatarId={user.avatarId}
        onSelect={async (id) => {
          setAvatarModalOpen(false);
          await patchProfile({ avatarId: id });
        }}
        onClose={() => setAvatarModalOpen(false)}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runSave();
        }}
        className="form"
      >
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {savedAt !== null && !error && (
          <p className="hint" role="status" aria-live="polite">
            {t('auth.account.saveSuccess')}
          </p>
        )}

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
            setSavedAt(null);
          }}
          required
          maxLength={80}
        />

        <label className="label" htmlFor="profile-bio">
          {t('profile.settings.bioLabel')}
        </label>
        <textarea
          id="profile-bio"
          className="input"
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            setSavedAt(null);
          }}
          maxLength={BIO_MAX_LENGTH}
          rows={3}
          aria-describedby={showBioHint ? 'profile-bio-hint' : undefined}
        />
        {showBioHint && (
          <p id="profile-bio-hint" className="hint" aria-live="polite">
            {t('profile.settings.bioHint', { count: String(bioCharsLeft) })}
          </p>
        )}

        <div className={styles.visibilityRow}>
          <Globe size={16} aria-hidden className={styles.visibilityIcon} />
          <span className={styles.visibilityLabel}>{t('profile.settings.visibilityLabel')}</span>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            aria-label={t('profile.settings.visibilityLabel')}
            className={styles.toggle}
            onClick={() => {
              setIsPublic((v) => !v);
              setSavedAt(null);
            }}
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? t('auth.account.saving') : t('common.save')}
        </button>
      </form>
    </section>
  );
}
