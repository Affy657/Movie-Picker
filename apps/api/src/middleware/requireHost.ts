import { Request, Response, NextFunction } from 'express';
import { IEventDoc } from '../models/Event';
import { AppError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      event?: IEventDoc;
    }
  }
}

const HOST_COOKIE_NAME = 'moviepicker_host';

/**
 * Récupère le token hôte depuis la query (?host=xxx) ou le cookie.
 */
export function getHostToken(req: Request): string | undefined {
  const fromQuery = typeof req.query.host === 'string' ? req.query.host : undefined;
  const fromCookie = req.cookies?.[HOST_COOKIE_NAME];
  return fromQuery ?? fromCookie;
}

/**
 * Middleware : vérifie que l'appelant est l'hôte de l'event (req.event doit être chargé avant).
 * Répond 403 si le token hôte est absent ou invalide.
 */
export function requireHost(req: Request, _res: Response, next: NextFunction): void {
  const event = req.event;
  if (!event) {
    next(new AppError('Event not loaded', 500));
    return;
  }
  const token = getHostToken(req);
  if (!token || token !== event.hostToken) {
    next(new AppError("Réservé à l'hôte de la soirée", 403));
    return;
  }
  next();
}

export const HOST_COOKIE = HOST_COOKIE_NAME;
