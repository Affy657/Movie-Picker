import { createContext, useContext } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import type { CreateEventReuse } from './CreateEventDialog';

export type OpenCreateEventOptions = {
  reuse?: CreateEventReuse | null;
  onClosed?: () => void;
};

export type OpenCreateEvent = (options?: OpenCreateEventOptions) => void;

export type CreateEventDialogControls = {
  open: OpenCreateEvent;
  dismiss: () => void;
};

export const CreateEventDialogContext = createContext<CreateEventDialogControls | null>(null);

export const loadCreateEventDialog = () => import('./CreateEventDialog');

const ignoreDismiss = () => undefined;

export function useOpenCreateEvent(): OpenCreateEvent {
  const controls = useContext(CreateEventDialogContext);
  const navigate = useNavigate();
  return controls?.open ?? (() => navigate(ROUTES.createEvent));
}

export function useDismissCreateEvent(): () => void {
  return useContext(CreateEventDialogContext)?.dismiss ?? ignoreDismiss;
}
