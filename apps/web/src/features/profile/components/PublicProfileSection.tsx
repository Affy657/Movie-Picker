import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { checkHandleAvailability } from '@/features/profile/api/profileApi';
import styles from '@/features/auth/pages/AccountPage.module.css';

const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;
const BIO_MAX_LENGTH = 140;
const AVAILABILITY_DEBOUNCE_MS = 400;

type AvailabilityState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available' }
  | { status: 'unavailable'; reason: string | null }
  | { status: 'invalid' };

export default function PublicProfileSection() {
  const { t } = useTranslation();
  const { user, patchProfile } = useAuth();

  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [availability, setAvailability] = useState<AvailabilityState>({ status: 'idle' });
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    setHandle(user.handle ?? '');
    setBio(user.bio ?? '');
    setIsPublic(user.isProfilePublic ?? true);
  }, [user]);

  const handleChanged = !!user && handle !== (user.handle ?? '');

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    if (!handleChanged) {
      setAvailability({ status: 'idle' });
      return;
    }
    if (!HANDLE_PATTERN.test(handle)) {
      setAvailability({ status: 'invalid' });
      return;
    }
    setAvailability({ status: 'checking' });
    debounceRef.current = window.setTimeout(() => {
      void checkHandleAvailability(handle)
        .then((res) =>
          setAvailability(
            res.available ? { status: 'available' } : { status: 'unavailable', reason: res.reason }
          )
        )
        .catch(() => setAvailability({ status: 'idle' }));
    }, AVAILABILITY_DEBOUNCE_MS);
    return () => window.clearTimeout(debounceRef.current);
  }, [handle, handleChanged]);

  const saveAction = useCallback(async () => {
    if (!user) return;
    await patchProfile({
      ...(handleChanged ? { handle } : {}),
      bio: bio.trim() === '' ? null : bio.trim(),
      isProfilePublic: isPublic,
    });
    setSavedAt(Date.now());
    setAvailability({ status: 'idle' });
  }, [user, patchProfile, handleChanged, handle, bio, isPublic]);

  const {
    run: runSave,
    loading: saving,
    error,
  } = useAsyncAction(saveAction, t('profile.settings.fallbackError'));

  if (!user) return null;

  const handleInvalid = handle.length > 0 && !HANDLE_PATTERN.test(handle);
  const blockSave =
    saving ||
    handleInvalid ||
    availability.status === 'checking' ||
    availability.status === 'unavailable' ||
    availability.status === 'invalid';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runSave();
  };

  return (
    <section className="section section--panel" aria-labelledby="public-profile-heading">
      <h2 id="public-profile-heading" className={styles.sectionTitle}>
        <Globe size={18} aria-hidden />
        {t('profile.settings.title')}
      </h2>
      <p className="hint">{t('profile.settings.description')}</p>

      <form onSubmit={handleSubmit} className="form">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {savedAt != null && !error && (
          <p className="hint" role="status" aria-live="polite">
            {t('profile.settings.saveSuccess')}
          </p>
        )}

        <label className="label" htmlFor="profile-handle">
          {t('profile.settings.handleLabel')}
        </label>
        <input
          id="profile-handle"
          type="text"
          className="input"
          value={handle}
          onChange={(e) => {
            setHandle(e.target.value.toLowerCase());
            setSavedAt(null);
          }}
          minLength={3}
          maxLength={20}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          aria-describedby="profile-handle-hint"
        />
        <p id="profile-handle-hint" className="hint" aria-live="polite">
          {availability.status === 'checking' && t('profile.settings.handleChecking')}
          {availability.status === 'available' && t('profile.settings.handleAvailable')}
          {availability.status === 'unavailable' &&
            (availability.reason ?? t('profile.settings.handleTaken'))}
          {(availability.status === 'invalid' ||
            (handleInvalid && availability.status === 'idle')) &&
            t('profile.settings.handleInvalid')}
          {availability.status === 'idle' && !handleInvalid && t('profile.settings.handleHint')}
        </p>

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
          aria-describedby="profile-bio-hint"
        />
        <p id="profile-bio-hint" className="hint">
          {t('profile.settings.bioHint', { count: String(BIO_MAX_LENGTH - bio.length) })}
        </p>

        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => {
              setIsPublic(e.target.checked);
              setSavedAt(null);
            }}
          />
          <span>{t('profile.settings.visibilityLabel')}</span>
        </label>
        <p className="hint">
          {isPublic
            ? t('profile.settings.visibilityPublicHint')
            : t('profile.settings.visibilityPrivateHint')}
        </p>

        {isPublic && user.handle && (
          <p className="hint">
            <Link to={ROUTES.profile(user.handle)}>{t('profile.settings.viewMyProfile')}</Link>
          </p>
        )}

        <button type="submit" className="btn btn-primary" disabled={blockSave}>
          {saving ? t('auth.account.saving') : t('common.save')}
        </button>
      </form>
    </section>
  );
}
