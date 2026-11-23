import type { ReactElement } from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import LegalNoticePage from '@/app/pages/LegalNoticePage';
import PrivacyPolicyPage from '@/app/pages/PrivacyPolicyPage';
import { fr } from '@/shared/i18n/locales/fr';

function descriptionOf(page: ReactElement): string | null {
  render(
    <AppTestProviders>
      <MemoryRouter>{page}</MemoryRouter>
    </AppTestProviders>
  );
  return document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? null;
}

describe('LegalContentPage', () => {
  it('describes the legal notice with its own introduction', () => {
    expect(descriptionOf(<LegalNoticePage />)).toBe(fr.legal.noticeIntro);
  });

  it('describes the privacy policy with its own introduction', () => {
    expect(descriptionOf(<PrivacyPolicyPage />)).toBe(fr.legal.privacyIntro);
  });
});
