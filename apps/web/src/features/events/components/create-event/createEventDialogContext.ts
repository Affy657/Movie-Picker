import { createContext, useContext } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import type { CreateEventReuse } from './CreateEventDialog';

export type OpenCreateEventOptions = {
  reuse?: CreateEventReuse | null;
  onClosed?: () => void;
};

export type OpenCreateEvent = (options?: OpenCreateEventOptions) => void;

export const CreateEventDialogContext = createContext<OpenCreateEvent | null>(null);

export const loadCreateEventDialog = () => import('./CreateEventDialog');

export function useOpenCreateEvent(): OpenCreateEvent {
  const open = useContext(CreateEventDialogContext);
  const navigate = useNavigate();
  return open ?? (() => navigate(ROUTES.createEvent));
}
