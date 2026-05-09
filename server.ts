import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authMiddleware } from './src/lib/middleware';
import { AnalyticsService } from './src/modules/analytics/analytics.service';
import { QueueService } from './src/modules/queue/queue.service';
import { TemplateService } from './src/modules/templates/template.service';
import { db } from './src/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Protected Routes
  const api = express.Router();
  api.use(authMiddleware);

  // Search
  api.get('/search', async (req, res) => {
    const q = req.query.q as string;
    if (!q || q.length < 2) return res.json({ leads: [], campaigns: [], templates: [] });
    
    try {
      const workspaceId = req.user!.workspaceId;
      
      // Basic Firestore search (exact match or simple filter)
      // Note: Full-text search in Firestore usually requires Algolia/Meilisearch
      // For this demo, we'll do a simple "starts with" search
      const searchIn = async (collectionName: string, field: string) => {
        const queryRef = query(
          collection(db, collectionName),
          where('workspaceId', '==', workspaceId),
          where(field, '>=', q),
          where(field, '<=', q + '\uf8ff'),
          limit(5)
        );
        const snap = await getDocs(queryRef);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      };

      const [leads, campaigns, templates] = await Promise.all([
        searchIn('leads', 'email'),
        searchIn('campaigns', 'name'),
        searchIn('templates', 'name')
      ]);
      
      res.json({ leads, campaigns, templates });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Campaigns
  api.get('/campaigns', async (req, res) => {
    try {
      const q = query(collection(db, 'campaigns'), where('workspaceId', '==', req.user!.workspaceId));
      const snap = await getDocs(q);
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics
  api.get('/analytics/overview', async (req, res) => {
    try {
      const metrics = await AnalyticsService.getWorkspaceMetrics(req.user!.workspaceId);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Templates
  api.get('/templates', async (req, res) => {
    try {
      const templates = await TemplateService.getTemplates(req.user!.workspaceId);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.use('/api', api);

  // Start background worker
  QueueService.startWorker();

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
