import { describe, it, expect } from 'vitest';
import { eventCountdown } from '@/shared/utils/eventCountdown';
import { eventScheduledStartUtcMs } from '@/shared/utils/eventScheduled';

const START = eventScheduledStartUtcMs({ date: '2026-08-19', time: '19:00' })!;

describe('eventCountdown', () => {
  it('renvoie null si la date ou l’heure manque', () => {
    expect(eventCountdown(undefined, '19:00', START)).toBeNull();
    expect(eventCountdown('2026-08-19', undefined, START)).toBeNull();
  });

  it('renvoie null si la date est invalide', () => {
    expect(eventCountdown('pas-une-date', '19:00', START)).toBeNull();
  });

  it('renvoie null quand le début est passé ou atteint', () => {
    expect(eventCountdown('2026-08-19', '19:00', START)).toBeNull();
    expect(eventCountdown('2026-08-19', '19:00', START + 60_000)).toBeNull();
  });

  it('signale un début imminent sous la minute', () => {
    expect(eventCountdown('2026-08-19', '19:00', START - 30_000)).toEqual({ unit: 'imminent' });
  });

  it('arrondit les minutes au supérieur', () => {
    expect(eventCountdown('2026-08-19', '19:00', START - 90_000)).toEqual({
      unit: 'minutes',
      count: 2,
    });
  });

  it('bascule en heures au-delà d’une heure', () => {
    expect(eventCountdown('2026-08-19', '19:00', START - 22 * 3_600_000 - 400_000)).toEqual({
      unit: 'hours',
      count: 22,
    });
  });

  it('renvoie null au-delà de la fenêtre de 24 h', () => {
    expect(eventCountdown('2026-08-19', '19:00', START - 86_400_000)).toBeNull();
    expect(eventCountdown('2026-08-19', '19:00', START - 3 * 86_400_000)).toBeNull();
  });

  it('affiche encore les heures juste sous les 24 h', () => {
    expect(eventCountdown('2026-08-19', '19:00', START - 86_400_000 + 60_000)).toEqual({
      unit: 'hours',
      count: 23,
    });
  });
});
