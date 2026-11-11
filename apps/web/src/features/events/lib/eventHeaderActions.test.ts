import { describe, expect, it } from 'vitest';
import { eventHeaderActions, type EventHeaderActionsInput } from './eventHeaderActions';

const host: EventHeaderActionsInput = {
  isHost: true,
  isFinished: false,
  lifecycle: 'upcoming',
  canAddMovie: true,
  canSpin: true,
  noMovie: false,
  hasWinner: false,
  remainingDraws: 1,
  canRemoveWinner: false,
  canReset: false,
  canCloseWithoutMovie: false,
  canRate: false,
};

const guest: EventHeaderActionsInput = { ...host, isHost: false, canSpin: false };

describe('eventHeaderActions', () => {
  it('makes proposing the main action of a night without movies', () => {
    expect(eventHeaderActions({ ...host, noMovie: true })).toEqual({
      addMovie: 'primary',
      draw: null,
      manage: null,
      chosen: false,
      rate: false,
    });
  });

  it('keeps proposing first while the host can already spin the wheel', () => {
    const plan = eventHeaderActions(host);
    expect(plan.addMovie).toBe('primary');
    expect(plan.draw).toBe('secondary');
    expect(plan.manage).toBeNull();
  });

  it('makes the next draw the main action once a winner is drawn and more remain', () => {
    const plan = eventHeaderActions({
      ...host,
      hasWinner: true,
      remainingDraws: 2,
      canRemoveWinner: true,
      canReset: true,
    });
    expect(plan.draw).toBe('primary');
    expect(plan.addMovie).toBe('secondary');
    expect(plan.manage).toEqual({ removeWinner: true, reset: true, closeWithoutMovie: false });
  });

  it('shows the movie as chosen without a main action once every draw is done', () => {
    const plan = eventHeaderActions({
      ...host,
      hasWinner: true,
      remainingDraws: 0,
      canRemoveWinner: true,
      canReset: true,
    });
    expect(plan.chosen).toBe(true);
    expect(plan.draw).toBeNull();
    expect(plan.addMovie).toBe('secondary');
  });

  it('lets a guest keep proposing as the main action until the movie is chosen', () => {
    expect(eventHeaderActions({ ...guest, hasWinner: true, remainingDraws: 1 }).addMovie).toBe(
      'primary'
    );
    const chosen = eventHeaderActions({ ...guest, hasWinner: true, remainingDraws: 0 });
    expect(chosen.addMovie).toBe('secondary');
    expect(chosen.chosen).toBe(true);
    expect(chosen.draw).toBeNull();
    expect(chosen.manage).toBeNull();
  });

  it('puts the wheel first and closing without a movie in the draw menu of a pending night', () => {
    const plan = eventHeaderActions({ ...host, lifecycle: 'pending', canCloseWithoutMovie: true });
    expect(plan.draw).toBe('primary');
    expect(plan.addMovie).toBe('secondary');
    expect(plan.manage).toEqual({ removeWinner: false, reset: false, closeWithoutMovie: true });
  });

  it('makes rating the main action once the movie can be rated', () => {
    const plan = eventHeaderActions({
      ...host,
      lifecycle: 'live',
      hasWinner: true,
      remainingDraws: 0,
      canRemoveWinner: true,
      canReset: true,
      canRate: true,
    });
    expect(plan.rate).toBe(true);
    expect(plan.chosen).toBe(false);
    expect(plan.addMovie).toBe('secondary');
  });

  it('only offers rating on a finished night', () => {
    expect(
      eventHeaderActions({
        ...guest,
        isFinished: true,
        lifecycle: 'finished',
        canAddMovie: false,
        hasWinner: true,
        remainingDraws: 0,
        canRate: true,
      })
    ).toEqual({ addMovie: null, draw: null, manage: null, chosen: false, rate: true });
  });
});
