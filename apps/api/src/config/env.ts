/**
 * Variables d'environnement. MONGODB_URI est validée au premier accès (au démarrage du serveur).
 * En dev, charger le .env avant (ex. dotenv/config dans index).
 */

function getEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Variable d'environnement manquante: ${name}. Voir .env.example.`);
  }
  return value;
}

export const env = {
  get port(): number {
    const p = process.env.PORT;
    if (p === undefined || p === '') return 4000;
    const n = parseInt(p, 10);
    if (Number.isNaN(n)) return 4000;
    return n;
  },

  get mongodbUri(): string {
    return getEnv('MONGODB_URI');
  },

  get tmdbApiKey(): string | undefined {
    const v = process.env.TMDB_API_KEY;
    return v === undefined || v === '' ? undefined : v;
  },
};
