import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '@/shared/appVersion';
import { SUPPORT_EMAIL, buildSupportMailto } from './supportMailto';

const labels = {
  subject: '[Movie Picker] Signalement',
  describe: 'Décrivez le problème :',
  steps: 'Étapes :',
  expected: 'Attendu :',
  observed: 'Observé :',
  technicalHeader: '--- technique ---',
  page: 'Page :',
  version: 'Version :',
  browser: 'Navigateur :',
};

function decodedBody(href: string): string {
  const body = new URL(href).searchParams.get('body');
  return body ?? '';
}

describe('buildSupportMailto', () => {
  it('cible l’adresse de support avec le sujet traduit', () => {
    const href = buildSupportMailto({ path: '/', labels });

    expect(href.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
    expect(new URL(href).searchParams.get('subject')).toBe(labels.subject);
  });

  it('pré-remplit le gabarit de signalement avec le contexte technique', () => {
    const href = buildSupportMailto({
      path: '/events/soiree-cine',
      userAgent: 'Mozilla/5.0 (Test)',
      labels,
    });

    const body = decodedBody(href);
    expect(body).toContain(labels.describe);
    expect(body).toContain(labels.steps);
    expect(body).toContain(labels.expected);
    expect(body).toContain(labels.observed);
    expect(body).toContain('Page : /events/soiree-cine');
    expect(body).toContain(`Version : ${APP_VERSION}`);
    expect(body).toContain('Navigateur : Mozilla/5.0 (Test)');
  });

  it('reste utilisable quand le navigateur n’est pas connu', () => {
    const body = decodedBody(buildSupportMailto({ path: '/login', labels }));

    expect(body).toContain('Navigateur : n/a');
  });
});
