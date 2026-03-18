import { Request, Response, NextFunction } from 'express';
import { IEventDoc } from '../models/Event';
import { AppError } from './errorHandler';

/**
 * Indique si l'event est considéré comme terminé (lecture seule) :
 * - clôturé par l'hôte (closedAt), ou
 * - date/heure de l'event dépassée, ou
 * - date de fin configurée (config.endDate) dépassée.
 */
export function isEventFinished(event: IEventDoc): boolean {
  if (event.closedAt) return true;
  const eventEnd = event.config?.endDate
    ? new Date(event.config.endDate).getTime()
    : new Date(`${event.date}T${event.time}:00`).getTime();
  return Date.now() >= eventEnd;
}

/**
 * Middleware : bloque les actions d'écriture si l'event est terminé.
 * À placer après loadEvent. Répond 400 avec message si terminé.
 */
export function requireEventNotFinished(req: Request, _res: Response, next: NextFunction): void {
  const event = req.event;
  if (!event) {
    next(new AppError('Event not loaded', 500));
    return;
  }
  if (isEventFinished(event)) {
    next(new AppError('Soirée terminée. Lecture seule.', 400));
    return;
  }
  next();
}
