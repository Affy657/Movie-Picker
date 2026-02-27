import path from 'path';
import http from 'http';

// En dev uniquement : charger .env (dotenv est en devDependencies, pas installé en prod)
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { config } = require('dotenv');
  const cwd = process.cwd();
  config({ path: path.resolve(cwd, '..', '..', '.env') });
  config({ path: path.resolve(cwd, '.env') });
}

// Port : Cloud Run fournit PORT=8080
const port = parseInt(process.env.PORT || '8080', 10);

// Répondre "Starting" tant que l'app n'est pas chargée (pour que Cloud Run voie le port ouvert tout de suite)
let app: http.RequestListener | null = null;
const server = http.createServer((req, res) => {
  if (app) {
    app(req, res);
  } else {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'starting', service: 'movie-picker-api' }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`API listening on port ${port}`);
  // Charger Express et MongoDB après que le port soit ouvert (évite timeout Cloud Run)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appModule = require('./app');
    app = appModule.default as http.RequestListener;
    const { connectDb } = require('./config/db') as { connectDb: () => Promise<void> };
    connectDb()
      .then(() => console.log('MongoDB connected'))
      .catch((err) => {
        console.error('MongoDB connection failed:', err);
        process.exit(1);
      });
  } catch (err) {
    console.error('Failed to load app:', err);
    process.exit(1);
  }
});
