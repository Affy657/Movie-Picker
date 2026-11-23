import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import ReleaseNotesPage, { RECENT_RELEASES } from '@/app/pages/ReleaseNotesPage';
import { APP_VERSION } from '@/shared/appVersion';

function renderPage(entry = '/nouveautes') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[entry]}>
        <ReleaseNotesPage />
      </MemoryRouter>
    </AppTestProviders>
  );
}

function releaseOf(version: string) {
  const heading = screen.getByRole('heading', { name: `Version ${version}`, level: 2 });
  return (heading.closest('details') ?? heading.closest('section')) as HTMLElement;
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

  it('shows the latest versions in full and folds the older ones', () => {
    const { container } = renderPage();
    const folded = [...container.querySelectorAll('details')];
    const versions = screen.getAllByRole('heading', { level: 2 });

    expect(folded.length).toBe(versions.length - RECENT_RELEASES);
    expect(folded.every((release) => !release.open)).toBe(true);
    expect(versions[0]?.closest('details')).toBeNull();
    expect(versions.at(-1)?.closest('summary')).not.toBeNull();
  });

  it('opens a folded version that the address points at', () => {
    renderPage('/nouveautes#version-1-7-0');

    expect((releaseOf('1.7.0') as HTMLDetailsElement).open).toBe(true);
    expect((releaseOf('1.6.0') as HTMLDetailsElement).open).toBe(false);
  });

  it('names each kind of change in the reader language, with its entries', () => {
    renderPage();

    const first = releaseOf('1.7.0');
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
    const first = releaseOf('1.7.0');
    expect(within(first).getByRole('heading', { name: 'New', level: 3 })).toBeInTheDocument();
  });
});
