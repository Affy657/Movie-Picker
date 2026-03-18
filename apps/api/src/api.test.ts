/**
 * Tests d'intégration API : events, join, movies, votes, wheel, close.
 * Utilise mongodb-memory-server pour une base en mémoire.
 */
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import type { Express } from 'express';

let mongo: MongoMemoryServer;
let app: Express;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.TMDB_API_KEY = ''; // pas d'appel TMDB en test
  await mongoose.connect(process.env.MONGODB_URI);
  const appModule = await import('./app');
  app = appModule.default;
}, 20000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('GET /health', () => {
  it('répond ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'movie-picker-api' });
  });
});

// Dates dans le futur pour que les events ne soient pas considérés "terminés"
const FUTURE_DATE = '2030-12-31';
const FUTURE_TIME = '20:00';

describe('POST /events', () => {
  it('crée un event et retourne slug + hostToken', async () => {
    const res = await request(app)
      .post('/events')
      .send({ title: 'Soirée test', date: FUTURE_DATE, time: FUTURE_TIME });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('slug');
    expect(res.body).toHaveProperty('hostToken');
    expect(res.body).toHaveProperty('shareUrl', '/s/' + res.body.slug);
    expect(res.body.title).toBe('Soirée test');
  });

  it('refuse un body invalide', async () => {
    const res = await request(app).post('/events').send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /events/slug/:slug', () => {
  it('retourne l’event par slug', async () => {
    const create = await request(app)
      .post('/events')
      .send({ title: 'Event slug', date: FUTURE_DATE, time: '19:00' });
    const slug = create.body.slug;
    const res = await request(app).get('/events/slug/' + slug);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Event slug');
    expect(res.body).toHaveProperty('terminé');
  });

  it('404 pour slug inconnu', async () => {
    const res = await request(app).get('/events/slug/inconnu12345');
    expect(res.status).toBe(404);
  });
});

describe('POST /events/:idOrSlug/join', () => {
  it('ajoute un participant', async () => {
    const create = await request(app)
      .post('/events')
      .send({ title: 'Event join', date: FUTURE_DATE, time: '20:00' });
    const slug = create.body.slug;
    const res = await request(app)
      .post('/events/' + slug + '/join')
      .set('Content-Type', 'application/json')
      .send({ pseudo: 'Alice' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('pseudo', 'Alice');
    expect(res.body).toHaveProperty('eventId');
  });

  it('idempotent : même pseudo retourne 200', async () => {
    const create = await request(app)
      .post('/events')
      .send({ title: 'Event idem', date: FUTURE_DATE, time: '21:00' });
    const slug = create.body.slug;
    await request(app)
      .post('/events/' + slug + '/join')
      .send({ pseudo: 'Bob' });
    const res = await request(app)
      .post('/events/' + slug + '/join')
      .send({ pseudo: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Déjà inscrit');
  });
});

describe('Parcours complet : event → join → movie → vote → wheel → close', () => {
  it('parcours complet sans erreur', async () => {
    const createEvent = await request(app)
      .post('/events')
      .send({ title: 'Soirée complète', date: FUTURE_DATE, time: '19:30' });
    expect(createEvent.status).toBe(201);
    const { slug, hostToken } = createEvent.body;

    const join = await request(app)
      .post('/events/' + slug + '/join')
      .send({ pseudo: 'Host' });
    expect(join.status).toBe(201);
    const hostParticipantId = join.body._id;

    const join2 = await request(app)
      .post('/events/' + slug + '/join')
      .send({ pseudo: 'Invité' });
    expect(join2.status).toBe(201);
    const guestParticipantId = join2.body._id;

    const addMovie = await request(app)
      .post('/events/' + slug + '/movies')
      .set('Cookie', 'moviepicker_host=' + hostToken)
      .send({
        tmdbId: 12345,
        title: 'Un film',
        year: '2024',
        participantId: hostParticipantId,
      });
    expect(addMovie.status).toBe(201);

    const addMovie2 = await request(app)
      .post('/events/' + slug + '/movies')
      .send({
        tmdbId: 67890,
        title: 'Autre film',
        year: '2023',
        participantId: guestParticipantId,
      });
    expect(addMovie2.status).toBe(201);

    const movieId = addMovie.body._id;
    const vote = await request(app)
      .post('/events/' + slug + '/movies/' + movieId + '/vote')
      .send({ participantId: guestParticipantId, value: 1 });
    expect(vote.status).toBe(200);

    const wheel = await request(app)
      .post('/events/' + slug + '/wheel')
      .set('Cookie', 'moviepicker_host=' + hostToken);
    expect(wheel.status).toBe(200);
    expect(wheel.body).toHaveProperty('winner');

    const close = await request(app)
      .post('/events/' + slug + '/close')
      .set('Cookie', 'moviepicker_host=' + hostToken);
    expect(close.status).toBe(200);
    expect(close.body.message).toContain('clôturée');
  });
});
