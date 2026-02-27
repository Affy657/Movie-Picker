import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Movie } from '../models/Movie';
import { Vote } from '../models/Vote';
import { Participant } from '../models/Participant';
import { IEventDoc } from '../models/Event';
import { AppError } from '../middleware/errorHandler';
import { requireEventNotFinished } from '../middleware/eventStatus';
import type { IRouter } from 'express';

const router: IRouter = Router();

const AddMovieSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().min(1).max(500).trim(),
  year: z.string().max(10),
  posterPath: z.union([z.string().url(), z.null()]).optional(),
  participantId: z.string().length(24),
});

const VoteSchema = z.object({
  participantId: z.string().length(24),
  value: z.union([z.literal(1), z.literal(-1)]),
});

// GET / — Liste des films de l'event avec proposant et score
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.event as IEventDoc;
    const movies = await Movie.find({ eventId: event._id })
      .populate<{ participantId: { pseudo: string } }>('participantId', 'pseudo')
      .lean();
    const movieIds = movies.map((m) => m._id);
    const votes = await Vote.aggregate([
      { $match: { movieId: { $in: movieIds } } },
      { $group: { _id: '$movieId', score: { $sum: '$value' }, up: { $sum: { $cond: [{ $eq: ['$value', 1] }, 1, 0] } }, down: { $sum: { $cond: [{ $eq: ['$value', -1] }, 1, 0] } } } },
    ]);
    const scoreByMovie = new Map(votes.map((v) => [v._id.toString(), { score: v.score, up: v.up, down: v.down }]));
    const list = movies.map((m) => {
      const s = scoreByMovie.get(m._id.toString()) ?? { score: 0, up: 0, down: 0 };
      return {
        ...m,
        proposerPseudo: (m.participantId as { pseudo: string } | null)?.pseudo ?? '',
        score: s.score,
        up: s.up,
        down: s.down,
      };
    });
    res.json(list);
  } catch (e) {
    next(e as AppError);
  }
});

// POST / — Ajouter un film (vérifier doublon tmdbId ou titre)
router.post('/', requireEventNotFinished, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.event as IEventDoc;
    const parsed = AddMovieSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join('; ');
      res.status(400).json({ error: msg });
      return;
    }
    const { tmdbId, title, year, posterPath, participantId } = parsed.data;
    const participant = await Participant.findOne({ _id: participantId, eventId: event._id });
    if (!participant) {
      res.status(400).json({ error: 'Participant invalide pour cette soirée' });
      return;
    }
    const existingByTmdb = await Movie.findOne({ eventId: event._id, tmdbId });
    if (existingByTmdb) {
      res.status(409).json({ error: 'Ce film a déjà été proposé (même id TMDB)' });
      return;
    }
    const existingByTitle = await Movie.findOne({
      eventId: event._id,
      title: { $regex: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (existingByTitle) {
      res.status(409).json({ error: 'Un film avec ce titre a déjà été proposé' });
      return;
    }
    const movie = await Movie.create({
      eventId: event._id,
      participantId: participant._id,
      tmdbId,
      title,
      year,
      posterPath: posterPath ?? null,
    });
    const populated = await Movie.findById(movie._id)
      .populate<{ participantId: { pseudo: string } }>('participantId', 'pseudo')
      .lean();
    res.status(201).json({
      ...populated,
      proposerPseudo: (populated?.participantId as { pseudo: string } | null)?.pseudo ?? '',
      score: 0,
      up: 0,
      down: 0,
    });
  } catch (e) {
    next(e as AppError);
  }
});

// DELETE /:movieId — Supprimer un film (par le proposant, si roue non lancée)
router.delete('/:movieId', requireEventNotFinished, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.event as IEventDoc;
    if (event.winnerMovieId) {
      res.status(400).json({ error: 'La roue a déjà été lancée, suppression impossible' });
      return;
    }
    const movieId = req.params.movieId;
    const movie = await Movie.findOne({ _id: movieId, eventId: event._id });
    if (!movie) {
      res.status(404).json({ error: 'Film introuvable' });
      return;
    }
    const participantId = req.body.participantId as string | undefined;
    if (!participantId || movie.participantId.toString() !== participantId) {
      res.status(403).json({ error: 'Seul le participant qui a proposé peut retirer ce film' });
      return;
    }
    await Vote.deleteMany({ movieId: movie._id });
    await Movie.deleteOne({ _id: movie._id });
    res.status(204).send();
  } catch (e) {
    next(e as AppError);
  }
});

// POST /:movieId/vote — Upvote ou downvote (un vote par participant par film)
router.post('/:movieId/vote', requireEventNotFinished, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.event as IEventDoc;
    const movieId = req.params.movieId;
    const parsed = VoteSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join('; ');
      res.status(400).json({ error: msg });
      return;
    }
    const { participantId, value } = parsed.data;
    const movie = await Movie.findOne({ _id: movieId, eventId: event._id });
    if (!movie) {
      res.status(404).json({ error: 'Film introuvable' });
      return;
    }
    const participant = await Participant.findOne({ _id: participantId, eventId: event._id });
    if (!participant) {
      res.status(400).json({ error: 'Participant invalide pour cette soirée' });
      return;
    }
    const vote = await Vote.findOneAndUpdate(
      { movieId: movie._id, participantId: participant._id },
      { $set: { eventId: event._id, value } },
      { new: true, upsert: true }
    );
    res.json(vote.toObject());
  } catch (e) {
    next(e as AppError);
  }
});

export default router;
