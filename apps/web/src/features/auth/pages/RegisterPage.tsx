import { useCallback, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import AuthPageShell, { authPageShellStyles } from '@/features/auth/components/AuthPageShell';
import PageLayout from '@/shared/components/PageLayout';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import OAuthProviderButtons from '@/features/auth/components/OAuthProviderButtons';
import { returnsToEvent } from '@/features/auth/utils/eventReturn';
import { displayNameProblem, looksLikeEmail } from '@/features/auth/utils/authFormValidation';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { safeReturnTo } from '@/shared/utils/returnTo';
import { withReturnTo, ROUTES } from '@/app/routes';
import { useTranslation, type Translate } from '@/shared/i18n';
import { isRegisterPasswordCompliant } from '@/shared/utils/authPasswordRules';
import Button from '@/shared/components/Button';
import Field from '@/shared/components/Field';
import PasswordInput from '@/shared/components/PasswordInput';

type RegisterFieldErrors = {
  displayName?: string;
  email?: string;
  password?: string;
};

const DISPLAY_NAME_ERROR_KEYS = {
  missing: 'auth.register.displayNameRequired',
  blank: 'auth.register.displayNameBlank',
} as const;

function registerFieldErrors(
  values: { displayName: string; email: string; password: string },
  t: Translate
): RegisterFieldErrors {
  const nameProblem = displayNameProblem(values.displayName);
  return {
    displayName: nameProblem ? t(DISPLAY_NAME_ERROR_KEYS[nameProblem]) : undefined,
    email: looksLikeEmail(values.email) ? undefined : t('auth.register.emailInvalid'),
    password: isRegisterPasswordCompliant(values.password)
      ? undefined
      : t('auth.register.passwordRulesError'),
  };
}

function hasFieldError(errors: RegisterFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export default function RegisterPage() {
  const { t } = useTranslation();
  useNoindexPage(pageTitle(t('auth.register.title')), ROUTES.register);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));

  const { register, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});

  const registerAction = useCallback(async () => {
    await register(email.trim(), password, displayName.trim(), returnTo);
    void navigate(returnTo, { replace: true });
  }, [email, password, displayName, register, navigate, returnTo]);

  const {
    run: submit,
    loading,
    error,
  } = useAsyncAction(registerAction, t('auth.register.fallbackError'));

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors = registerFieldErrors({ displayName, email, password }, t);
    setFieldErrors(errors);
    if (hasFieldError(errors)) return;
    void submit();
  };

  const clearFieldError = (field: keyof RegisterFieldErrors) =>
    setFieldErrors((current) => ({ ...current, [field]: undefined }));

  if (user) return <Navigate to={returnTo} replace />;

  return (
    <PageLayout className={authPageShellStyles.layout}>
      <AuthPageShell
        title={t('auth.register.title')}
        description={t(
          returnsToEvent(returnTo) ? 'auth.register.eventDescription' : 'auth.register.description'
        )}
        returnTo={returnTo}
      >
        <OAuthProviderButtons returnTo={returnTo} placement="before" />
        <form
          onSubmit={handleSubmit}
          className="form"
          noValidate
          aria-describedby={error ? 'register-form-error' : undefined}
        >
          {error && (
            <p id="register-form-error" className="error" role="alert">
              {error}
            </p>
          )}
          <Field
            label={t('auth.register.displayNameLabel')}
            htmlFor="register-displayName"
            hint={t('auth.register.displayNameHint')}
            error={fieldErrors.displayName}
          >
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="text"
                className="input"
                autoComplete="nickname"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  clearFieldError('displayName');
                }}
                required
                maxLength={80}
                aria-describedby={describedBy}
                aria-invalid={invalid || error ? true : undefined}
              />
            )}
          </Field>
          <Field
            label={t('auth.register.emailLabel')}
            htmlFor="register-email"
            error={fieldErrors.email}
          >
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="email"
                className="input"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                }}
                required
                aria-describedby={describedBy}
                aria-invalid={invalid || error ? true : undefined}
              />
            )}
          </Field>
          <Field
            label={t('auth.register.passwordLabel')}
            htmlFor="register-password"
            hint={t('auth.register.passwordRulesHint')}
            error={fieldErrors.password}
          >
            {({ id, describedBy, invalid }) => (
              <PasswordInput
                id={id}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError('password');
                }}
                required
                minLength={8}
                aria-describedby={describedBy}
                aria-invalid={invalid || error ? true : undefined}
              />
            )}
          </Field>
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            {loading ? t('auth.register.submitting') : t('auth.register.submit')}
          </Button>
        </form>
        <p className="muted">
          {t('auth.register.publicProfileNote')}{' '}
          <Link to={ROUTES.privacyPolicy}>{t('auth.register.privacyPolicyLink')}</Link>
        </p>
        <p className="muted">
          {t('auth.register.loginPrompt')}{' '}
          <Link to={withReturnTo(ROUTES.login, returnTo)}>{t('auth.register.loginLink')}</Link>
        </p>
      </AuthPageShell>
    </PageLayout>
  );
}
