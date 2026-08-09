import { APP_VERSION } from '@/shared/appVersion';

export const SUPPORT_EMAIL = 'contact@movie-picker.fr';

export type SupportLabels = {
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

export type SupportContext = {
  path: string;
  userAgent?: string;
  labels: SupportLabels;
};

export function buildSupportReportBody({ path, userAgent, labels }: SupportContext): string {
  return [
    `${labels.describe}\n\n`,
    `${labels.steps}\n1. \n2. \n3. \n`,
    `${labels.expected}\n\n`,
    `${labels.observed}\n\n`,
    labels.technicalHeader,
    `${labels.page} ${path}`,
    `${labels.version} ${APP_VERSION}`,
    `${labels.browser} ${userAgent ?? 'n/a'}`,
  ].join('\n');
}

export function buildSupportMailto(context: SupportContext): string {
  const body = buildSupportReportBody(context);
  const subject = encodeURIComponent(context.labels.subject);
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${encodeURIComponent(body)}`;
}

export function buildSupportReportText(
  context: SupportContext,
  fieldLabels: { recipientFieldLabel: string; subjectFieldLabel: string }
): string {
  return [
    `${fieldLabels.recipientFieldLabel} ${SUPPORT_EMAIL}`,
    `${fieldLabels.subjectFieldLabel} ${context.labels.subject}`,
    '',
    buildSupportReportBody(context),
  ].join('\n');
}
