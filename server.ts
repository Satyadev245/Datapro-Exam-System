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

  // Production frontend is hosted on Netlify while this API runs on Render.
  // Keep the allowed origin explicit instead of using wildcard CORS with credentials.
  // CORS: allow the deployed Netlify frontend and any explicitly configured origins.
  // Normalize trailing slashes so an accidental slash in Render variables does not break preflight.
  const configuredOrigins = [
    'https://datapro-examination-system.netlify.app',
    ...(process.env.CORS_ORIGINS || '')
      .split(',')
      .map((value) => value.trim().replace(/\/$/, ''))
      .filter(Boolean),
    ...(process.env.APP_URL || '')
      .split(',')
      .map((value) => value.trim().replace(/\/$/, ''))
      .filter(Boolean),
  ];

  app.use((req, res, next) => {
    const origin = String(req.headers.origin || '').trim().replace(/\/$/, '');

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
        'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS'
      );
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    // Browser preflight requests must be completed before authentication/API routing.
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  });

  // Parse JSON and urlencoded requests
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  console.log('🗄️ Initializing PostgreSQL database...');
  try {
    await getDb();
    console.log('✅ DataPro Institute PostgreSQL database connected and initialized.');
  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
    if (isProduction) {
      process.exit(1);
    }
  }

  // Mount REST APIs
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      institute: 'DataPro Institute, Gajuwaka',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  if (!isProduction) {
    // Development mode: Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve dist folder
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 DataPro Examination Management Portal running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
});
