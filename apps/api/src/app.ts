import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import eventsRouter from './routes/events';
import { errorHandler } from './middleware/errorHandler';
import { searchMovies } from './services/tmdb';
import { env } from './config/env';
import { swaggerSpec } from './swagger';

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Swagger UI : spec injecté directement + validateur désactivé (évite page blanche et soucis de chemins)
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: { validatorUrl: null as string | null },
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'movie-picker-api' });
});

// Recherche films TMDB (proxy côté serveur, clé en env)
app.get('/movies/search', async (req, res, next) => {
  try {
    if (!env.tmdbApiKey) {
      res.status(503).json({ error: 'Recherche films temporairement indisponible' });
      return;
    }
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const results = await searchMovies(q);
    res.json(results);
  } catch (e) {
    next(e);
  }
});

app.use('/events', eventsRouter);

app.use(errorHandler);

export default app;
