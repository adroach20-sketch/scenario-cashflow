import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import { registerRoutes } from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// Parse JSON request bodies
app.use(express.json());

// Initialize database (creates tables if they don't exist)
initDb();

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Register API routes
registerRoutes(app);

// In production: serve the built React app
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  // SPA fallback: any non-API route serves index.html
  app.get('{*splat}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
