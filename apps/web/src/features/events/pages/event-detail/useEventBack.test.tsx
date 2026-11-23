import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { ROUTES } from '@/app/routes';
import { useEventBack } from './useEventBack';

function BackButton() {
  const goBack = useEventBack();
  return (
    <button type="button" onClick={goBack}>
      back
    </button>
  );
}

function CurrentPath() {
  return <output>{useLocation().pathname}</output>;
}

function renderAt(entries: string[]) {
  render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <BackButton />
              <CurrentPath />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

function setBrowserEntryIndex(idx: number | null) {
  globalThis.history.replaceState(idx === null ? null : { idx }, '');
}

describe('useEventBack', () => {
  afterEach(() => setBrowserEntryIndex(null));

  it('goes back when the previous page belongs to the app', async () => {
    setBrowserEntryIndex(2);
    renderAt(['/mes-soirees', '/e/Ab3x']);

    await userEvent.click(screen.getByRole('button', { name: 'back' }));

    expect(screen.getByRole('status')).toHaveTextContent('/mes-soirees');
  });

  it('stays in the app when the night is the first page opened, whatever the browser history holds', async () => {
    setBrowserEntryIndex(0);
    renderAt(['/elsewhere', '/e/Ab3x']);

    await userEvent.click(screen.getByRole('button', { name: 'back' }));

    expect(screen.getByRole('status')).toHaveTextContent(ROUTES.home);
  });

  it('treats a browser entry the router never indexed as the first page', async () => {
    setBrowserEntryIndex(null);
    renderAt(['/elsewhere', '/r/recap1']);

    await userEvent.click(screen.getByRole('button', { name: 'back' }));

    expect(screen.getByRole('status')).toHaveTextContent(ROUTES.home);
  });
});
