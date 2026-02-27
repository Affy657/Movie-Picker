import { Request, Response, NextFunction } from 'express';
import { IEventDoc } from '../models/Event';

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
export function requireEventNotFinished(req: Request, res: Response, next: NextFunction): void {
  const event = req.event;
  if (!event) {
    res.status(500).json({ error: 'Event not loaded' });
    return;
  }
  if (isEventFinished(event)) {
    res.status(400).json({ error: 'Soirée terminée. Lecture seule.' });
    return;
  }
  next();
}
