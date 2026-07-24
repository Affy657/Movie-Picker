import { APP_VERSION } from '@/shared/appVersion';

export const SUPPORT_EMAIL = 'contact@movie-picker.fr';

type SupportMailtoOptions = {
  path: string;
  userAgent?: string;
  labels: {
    subject: string;
    describe: string;
    steps: string;
    expected: string;
    observed: string;
    technicalHeader: string;
    page: string;
    version: string;
    browser: string;
  };
};

export function buildSupportMailto({ path, userAgent, labels }: SupportMailtoOptions): string {
  const body = [
    `${labels.describe}\n\n`,
    `${labels.steps}\n1. \n2. \n3. \n`,
    `${labels.expected}\n\n`,
    `${labels.observed}\n\n`,
    labels.technicalHeader,
    `${labels.page} ${path}`,
    `${labels.version} ${APP_VERSION}`,
    `${labels.browser} ${userAgent ?? 'n/a'}`,
  ].join('\n');

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(labels.subject)}&body=${encodeURIComponent(body)}`;
}
