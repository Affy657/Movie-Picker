import path from 'path';
import fs from 'fs';

/**
 * Charge le spec OpenAPI pour Swagger UI.
 * En dev (tsx) on lit depuis src/, en prod depuis dist/.
 */
function loadSwaggerSpec(): Record<string, unknown> {
  const dir = __dirname;
  const cwd = process.cwd();
  const paths = [
    path.join(dir, 'swagger.json'),
    path.join(dir, '..', 'src', 'swagger.json'),
    path.join(cwd, 'src', 'swagger.json'),
    path.join(cwd, 'dist', 'swagger.json'),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      return JSON.parse(raw) as Record<string, unknown>;
    }
  }
  return { openapi: '3.0.3', info: { title: 'Movie Picker API', version: '0.0.1' }, paths: {} };
}

export const swaggerSpec = loadSwaggerSpec();
