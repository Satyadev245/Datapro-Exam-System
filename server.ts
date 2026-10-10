
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getDb } from './server/db.js';
import { apiRouter } from './server/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  // CORS configuration
  const configuredOrigins = [
    'https://datapro-exam-system.netlify.app',
    ...(process.env.CORS_ORIGINS || '')
      .split(',')
      .map((value) => value.trim().replace(/\/+$/, ''))
      .filter(Boolean),
    ...(process.env.APP_URL || '')
      .split(',')
      .map((value) => value.trim().replace(/\/+$/, ''))
      .filter(Boolean),
  ];

  app.use((req, res, next) => {
    const origin = String(req.headers.origin || '')
      .trim()
      .replace(/\/+$/, '');

    if (origin && configuredOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      );
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS'
      );
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    // Handle preflight before authentication and API routes.
    if (req.method === 'OPTIONS') {
      if (origin && !configuredOrigins.includes(origin)) {
        return res.status(403).json({
          error: 'Origin not allowed by CORS policy',
        });
      }

      return res.sendStatus(204);
    }

    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  console.log('Initializing PostgreSQL database...');

  try {
    await getDb();
    console.log('DataPro PostgreSQL database connected.');
  } catch (err) {
    console.error('Database initialization failed:', err);

    if (isProduction) {
      process.exit(1);
    }
  }

  // API routes
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      institute: 'DataPro Institute, Gajuwaka',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');

    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');

    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));

      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DataPro backend listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});

