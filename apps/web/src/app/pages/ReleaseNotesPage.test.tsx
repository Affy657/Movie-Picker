import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import ReleaseNotesPage from '@/app/pages/ReleaseNotesPage';
import { APP_VERSION } from '@/shared/appVersion';

function renderPage() {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <ReleaseNotesPage />
      </MemoryRouter>
    </AppTestProviders>
  );
}

afterEach(() => {
  localStorage.removeItem('moviepicker-locale');
});

describe('ReleaseNotesPage', () => {
  it('opens on the version the footer shows, newest first', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Journal des versions', level: 1 })
    ).toBeInTheDocument();
    const versions = screen.getAllByRole('heading', { level: 2 });
    expect(versions[0]).toHaveTextContent(`Version ${APP_VERSION}`);
    expect(versions.at(-1)).toHaveTextContent('Version 0.1.0');
  });

  it('never shows what is not published yet', () => {
    renderPage();

    expect(screen.queryByText(/non publié/i)).not.toBeInTheDocument();
  });

  it('names each kind of change in the reader language, with its entries', () => {
    renderPage();

    const first = screen.getByRole('region', { name: 'Version 1.7.0' });
    expect(
      within(first).getByRole('heading', { name: 'Nouveautés', level: 3 })
    ).toBeInTheDocument();
    expect(
      within(first).getByRole('heading', { name: 'Corrections', level: 3 })
    ).toBeInTheDocument();
    expect(
      within(first).getByText('Noter les films vus', { selector: 'strong' })
    ).toBeInTheDocument();
  });

  it('tells an English reader the log is kept in French', () => {
    localStorage.setItem('moviepicker-locale', 'en');
    renderPage();

    expect(screen.getByRole('heading', { name: 'Release notes', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/written in French/i)).toBeInTheDocument();
    const first = screen.getByRole('region', { name: 'Version 1.7.0' });
    expect(within(first).getByRole('heading', { name: 'New', level: 3 })).toBeInTheDocument();
  });
});
