
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';

import { getDb } from './server/db.js';
import { apiRouter } from './server/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  // Allowed frontend origins
  const allowedOrigins = new Set(
    [
      'https://datapro-exam-system.netlify.app',
      ...(process.env.CORS_ORIGINS || '')
        .split(',')
        .map((value) => value.trim().replace(/\/+$/, ''))
        .filter(Boolean),
      ...(process.env.APP_URL || '')
        .split(',')
        .map((value) => value.trim().replace(/\/+$/, ''))
        .filter(Boolean),
    ].filter(Boolean)
  );

  // CORS must run before API routes.
  app.use(
    cors({
      origin(origin, callback) {
        // Allow requests without an Origin header, such as server-to-server calls.
        if (!origin) {
          return callback(null, true);
        }

        const normalizedOrigin = origin.trim().replace(/\/+$/, '');

        if (allowedOrigins.has(normalizedOrigin)) {
          return callback(null, true);
        }

        console.warn(`CORS origin rejected: ${normalizedOrigin}`);
        return callback(new Error('Origin not allowed by CORS'));
      },
      methods: [
        'GET',
        'HEAD',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
      ],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
      ],
      credentials: true,
      maxAge: 86400,
      optionsSuccessStatus: 204,
    })
  );

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check does not require a database query.
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      institute: 'DataPro Institute, Gajuwaka',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Initialize PostgreSQL before registering application routes.
  console.log('Initializing PostgreSQL database...');

  try {
    await getDb();
    console.log('DataPro PostgreSQL database connected.');
  } catch (err) {
    console.error('Database initialization failed:', err);

    // Do not run an examination system with a failed database.
    if (isProduction) {
      process.exit(1);
    }

    throw err;
  }

  // API routes
  app.use('/api', apiRouter);

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
