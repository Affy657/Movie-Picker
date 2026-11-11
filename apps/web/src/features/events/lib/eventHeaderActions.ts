import type { MyEventLifecycle } from '@/shared/types/event';

export type HeaderActionWeight = 'primary' | 'secondary';

export type EventHeaderActionsInput = {
  isHost: boolean;
  isFinished: boolean;
  lifecycle: MyEventLifecycle;
  canAddMovie: boolean;
  canSpin: boolean;
  noMovie: boolean;
  hasWinner: boolean;
  remainingDraws: number;
  canRemoveWinner: boolean;
  canReset: boolean;
  canCloseWithoutMovie: boolean;
  canRate: boolean;
};

export type DrawManagement = {
  removeWinner: boolean;
  reset: boolean;
  closeWithoutMovie: boolean;
};

export type EventHeaderActionsPlan = {
  addMovie: HeaderActionWeight | null;
  draw: HeaderActionWeight | null;
  manage: DrawManagement | null;
  chosen: boolean;
  rate: boolean;
};

function drawWeight(input: EventHeaderActionsInput): HeaderActionWeight | null {
  if (!input.isHost || !input.canSpin || input.noMovie || input.remainingDraws === 0) return null;
  const mustPick = input.hasWinner || input.lifecycle === 'pending' || input.lifecycle === 'live';
  return mustPick ? 'primary' : 'secondary';
}

function drawManagement(input: EventHeaderActionsInput): DrawManagement | null {
  if (!input.isHost) return null;
  const management = {
    removeWinner: input.canRemoveWinner,
    reset: input.canReset,
    closeWithoutMovie: input.canCloseWithoutMovie,
  };
  return Object.values(management).some(Boolean) ? management : null;
}

export function eventHeaderActions(input: EventHeaderActionsInput): EventHeaderActionsPlan {
  const draw = drawWeight(input);
  const allDrawn = input.hasWinner && input.remainingDraws === 0;
  const rate = input.canRate;
  const chosen = allDrawn && !input.isFinished && !rate;
  let addMovie: HeaderActionWeight | null = null;
  if (input.canAddMovie) {
    addMovie = draw === 'primary' || allDrawn || rate ? 'secondary' : 'primary';
  }
  return {
    addMovie,
    draw,
    manage: drawManagement(input),
    chosen,
    rate,
  };
}
