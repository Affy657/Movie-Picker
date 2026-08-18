import { describe, it, expect } from 'vitest';
import {
  formatMyEventsListDate,
  formatEventTime,
  formatEventDateLong,
} from './formatMyEventsListDate';

describe('formatMyEventsListDate', () => {
  it('formats in French', () => {
    expect(formatMyEventsListDate('2026-04-30', 'fr')).toMatch(/30/);
  });

  it('inclut le jour de la semaine abrégé', () => {
    const currentYear = new Date().getFullYear();
    const result = formatMyEventsListDate(`${currentYear}-04-15`, 'fr');
    expect(result).toBe('mer. 15 avr.');
  });

  it('inclut le jour de la semaine côté anglais', () => {
    const currentYear = new Date().getFullYear();
    const result = formatMyEventsListDate(`${currentYear}-04-15`, 'en');
    expect(result).toBe('Wed 15 Apr');
  });

  it("n'affiche pas l'année si c'est l'année courante", () => {
    const currentYear = new Date().getFullYear();
    const isoDate = `${currentYear}-06-15`;
    const result = formatMyEventsListDate(isoDate, 'fr');
    expect(result).not.toMatch(String(currentYear));
  });

  it("affiche l'année si c'est une année différente", () => {
    const nextYear = new Date().getFullYear() + 1;
    const result = formatMyEventsListDate(`${nextYear}-06-15`, 'fr');
    expect(result).toMatch(String(nextYear));
  });

  it('garde le jour de la semaine quand l’année est affichée', () => {
    const nextYear = new Date().getFullYear() + 1;
    const result = formatMyEventsListDate(`${nextYear}-04-15`, 'fr');
    expect(result).toBe(`jeu. 15 avr. ${nextYear}`);
  });

  it('returns raw string on invalid input', () => {
    expect(formatMyEventsListDate('nope', 'fr')).toBe('nope');
  });
});

describe('formatEventTime', () => {
  it('affiche heure ronde sans minutes', () => {
    expect(formatEventTime('20:00')).toBe('20h');
    expect(formatEventTime('08:00')).toBe('8h');
  });

  it('affiche heures et minutes si minutes non nulles', () => {
    expect(formatEventTime('20:30')).toBe('20h30');
    expect(formatEventTime('08:05')).toBe('8h05');
  });
});

describe('formatEventDateLong', () => {
  it('écrit le jour en entier et le mois abrégé, sans année pour l’année en cours', () => {
    const currentYear = new Date().getFullYear();
    const result = formatEventDateLong(`${currentYear}-08-22`, '20:30', 'fr', 'à');
    expect(result).toMatch(/^\p{L}+ 22 août à 20h30$/u);
    expect(result).not.toContain(String(currentYear));
  });

  it('ajoute l’année quand elle diffère de l’année en cours', () => {
    const nextYear = new Date().getFullYear() + 1;
    expect(formatEventDateLong(`${nextYear}-04-15`, '21:00', 'fr', 'à')).toContain(
      `avr. ${nextYear} à 21h`
    );
  });

  it('utilise le joignant fourni', () => {
    expect(formatEventDateLong('2030-12-20', '19:05', 'en', 'at')).toContain('at 19h05');
  });

  it('renvoie la chaîne brute si la date est invalide', () => {
    expect(formatEventDateLong('nope', '20:00', 'fr', 'à')).toBe('nope');
  });
});
