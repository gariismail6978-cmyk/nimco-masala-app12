import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initialSeedDatabase } from './src/data/seedData.ts';
import { DatabaseSchema } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'wholesale_db.json');

function ensureDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialSeedDatabase, null, 2), 'utf-8');
      return initialSeedDatabase;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as DatabaseSchema;
  } catch (err) {
    console.error('Error reading wholesale_db.json, falling back to seed data:', err);
    return initialSeedDatabase;
  }
}

function saveDatabase(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing wholesale_db.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes for persistent database storage
  app.get('/api/db', (_req, res) => {
    const db = ensureDatabase();
    res.json(db);
  });

  app.post('/api/db', (req, res) => {
    const body = req.body as DatabaseSchema;
    if (!body || !Array.isArray(body.customers) || !Array.isArray(body.products)) {
      res.status(400).json({ error: 'Invalid database payload' });
      return;
    }
    saveDatabase(body);
    res.json({ ok: true });
  });

  app.post('/api/reset', (_req, res) => {
    saveDatabase(initialSeedDatabase);
    res.json(initialSeedDatabase);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wholesale ERP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
