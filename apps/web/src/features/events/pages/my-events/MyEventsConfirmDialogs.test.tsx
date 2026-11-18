import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import MyEventsConfirmDialogs from './MyEventsConfirmDialogs';
import type { MyEventsActions } from './useMyEventsActions';

function idleMutation() {
  return { isPending: false, mutate: vi.fn() };
}

function actionsClosing(keepsDrawnFilms: boolean): MyEventsActions {
  return {
    confirmDeleteSlug: null,
    setConfirmDeleteSlug: vi.fn(),
    deleteMutation: idleMutation(),
    confirmLeave: null,
    setConfirmLeave: vi.fn(),
    leaveMutation: idleMutation(),
    confirmClose: { slug: 'soiree', title: 'Ciné-club du mardi', keepsDrawnFilms },
    setConfirmClose: vi.fn(),
    closeMutation: idleMutation(),
    setDeleteError: vi.fn(),
    setLeaveError: vi.fn(),
    setCloseError: vi.fn(),
  } as unknown as MyEventsActions;
}

function renderDialogs(actions: MyEventsActions) {
  render(
    <LocaleProvider>
      <MyEventsConfirmDialogs actions={actions} historyEvents={[]} />
    </LocaleProvider>
  );
}

describe('MyEventsConfirmDialogs', () => {
  it('asks to finish the night as a plain confirmation, focused on its action', () => {
    renderDialogs(actionsClosing(true));

    expect(screen.getByRole('heading', { name: /^terminer la soirée/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terminer la soirée' })).toHaveFocus();
  });

  it('keeps closing without a movie a destructive confirmation, focused on Cancel', () => {
    renderDialogs(actionsClosing(false));

    expect(screen.getByRole('heading', { name: /^clôturer sans choisir/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus();
  });
});
