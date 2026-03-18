import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { Event, IEventDoc } from '../models/Event';
import { Participant } from '../models/Participant';
import { getHostToken, requireHost } from '../middleware/requireHost';
import { loadEvent } from '../middleware/loadEvent';
import { isEventFinished, requireEventNotFinished } from '../middleware/eventStatus';
import { AppError } from '../middleware/errorHandler';
import type { IRouter } from 'express';
import moviesRouter from './movies';
import { Movie } from '../models/Movie';

const router: IRouter = Router();

const CreateEventSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date attendu: YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Format heure attendu: HH:mm'),
});

const JoinEventSchema = z.object({
  pseudo: z.string().min(1).max(100).trim(),
});

function generateSlug(): string {
  return nanoid(10);
}

function generateHostToken(): string {
  return nanoid(32);
}

// POST /events — Créer un event (title, date, time) → hostToken + slug
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateEventSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join('; ');
      res.status(400).json({ error: msg });
      return;
    }
    const { title, date, time } = parsed.data;
    const slug = generateSlug();
    const hostToken = generateHostToken();
    const event = await Event.create({ title, date, time, slug, hostToken });
    const obj = event.toObject();
    res.status(201).json({
      ...obj,
      shareUrl: `/s/${event.slug}`,
      hostToken: event.hostToken,
    });
  } catch (e) {
    next(e as AppError);
  }
});

async function eventToJson(event: IEventDoc, isHost: boolean): Promise<Record<string, unknown>> {
  const obj = event.toObject() as Record<string, unknown>;
  const { hostToken: _, ...rest } = obj;
  let winnerMovie = null;
  if (event.winnerMovieId) {
    const movie = await Movie.findById(event.winnerMovieId).lean();
    winnerMovie = movie ?? null;
  }
  const terminé = isEventFinished(event);
  return { ...rest, isHost, winnerMovie, terminé };
}

// GET /events/slug/:idOrSlug — Détail event par id ou slug
router.get(
  '/slug/:idOrSlug',
  loadEvent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = req.event as IEventDoc;
      const token = getHostToken(req);
      const isHost = !!token && token === event.hostToken;
      res.json(await eventToJson(event, isHost));
    } catch (e) {
      next(e as AppError);
    }
  }
);

// GET /events/:id — Détail event par id (alias)
router.get('/:id', loadEvent, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.event as IEventDoc;
    const token = getHostToken(req);
    const isHost = !!token && token === event.hostToken;
    res.json(await eventToJson(event, isHost));
  } catch (e) {
    next(e as AppError);
  }
});

// POST /events/:idOrSlug/join — Rejoindre un event (pseudo)
router.post(
  '/:idOrSlug/join',
  loadEvent,
  requireEventNotFinished,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = JoinEventSchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.errors.map((e) => e.message).join('; ');
        res.status(400).json({ error: msg });
        return;
      }
      const event = req.event as IEventDoc;
      const { pseudo } = parsed.data;
      const existing = await Participant.findOne({ eventId: event._id, pseudo });
      if (existing) {
        res.status(200).json({
          participant: existing.toObject(),
          message: 'Déjà inscrit avec ce pseudo',
        });
        return;
      }
      const participant = await Participant.create({ eventId: event._id, pseudo });
      res.status(201).json(participant.toObject());
    } catch (e) {
      next(e as AppError);
    }
  }
);

// POST /events/:idOrSlug/wheel — Lancer la roue (réservé à l'hôte) : tirage, persistance du gagnant
router.post(
  '/:idOrSlug/wheel',
  loadEvent,
  requireHost,
  requireEventNotFinished,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = req.event as IEventDoc;
      if (event.closedAt) {
        res.status(400).json({ error: 'Soirée déjà clôturée' });
        return;
      }
      const movies = await Movie.find({ eventId: event._id }).lean();
      if (movies.length === 0) {
        res
          .status(400)
          .json({ error: 'Aucun film proposé. Proposez au moins un film pour lancer la roue.' });
        return;
      }
      const winner =
        movies.length === 1 ? movies[0] : movies[Math.floor(Math.random() * movies.length)]!;
      event.winnerMovieId = winner._id;
      await event.save();
      res.json({
        winner: winner,
        message: movies.length === 1 ? 'Un seul film proposé : gagnant direct.' : 'Roue lancée.',
      });
    } catch (e) {
      next(e as AppError);
    }
  }
);

// POST /events/:idOrSlug/close — Clôturer l'event (réservé à l'hôte)
router.post(
  '/:idOrSlug/close',
  loadEvent,
  requireHost,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = req.event as IEventDoc;
      if (event.closedAt) {
        res.status(200).json({ ...event.toObject(), message: 'Soirée déjà clôturée' });
        return;
      }
      event.closedAt = new Date();
      await event.save();
      res.json({ ...event.toObject(), message: 'Soirée clôturée.' });
    } catch (e) {
      next(e as AppError);
    }
  }
);

// Films et votes : GET/POST /events/:idOrSlug/movies, DELETE /:movieId, POST /:movieId/vote
router.use('/:idOrSlug/movies', loadEvent, moviesRouter);

export default router;
