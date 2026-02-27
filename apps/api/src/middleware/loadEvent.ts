import { Request, Response, NextFunction } from 'express';
import { Event, IEventDoc } from '../models/Event';
import { AppError } from './errorHandler';

/**
 * Charge l'event par id ou slug (req.params.idOrSlug) et le met dans req.event. 404 si non trouvé.
 */
export async function loadEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  const idOrSlug = req.params.idOrSlug ?? req.params.id;
  if (!idOrSlug) {
    next(new AppError('idOrSlug manquant', 400));
    return;
  }
  const isMongoId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
  const event = isMongoId
    ? await Event.findById(idOrSlug)
    : await Event.findOne({ slug: idOrSlug });
  if (!event) {
    res.status(404).json({ error: 'Soirée introuvable' });
    return;
  }
  req.event = event as IEventDoc;
  next();
}
