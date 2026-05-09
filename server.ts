import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { LeadService } from './src/modules/leads/lead.service';
import { authMiddleware } from './src/lib/middleware';
import { AnalyticsService } from './src/modules/analytics/analytics.service';
import { AuthService } from './src/modules/auth/auth.service';
import { QueueService } from './src/modules/queue/queue.service';

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

  // Auth: Bootstrap (Special endpoint for first setup)
  app.post('/api/auth/bootstrap', async (req, res) => {
    try {
      await AuthService.bootstrap();
      res.json({ success: true, message: 'System initialized' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Protected Routes
  const api = express.Router();
  api.use(authMiddleware);

  // Leads
  api.get('/leads', async (req, res) => {
    try {
      const leads = await LeadService.getLeads(req.user!.workspaceId, req.query as any);
      res.json(leads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.post('/leads', async (req, res) => {
    try {
      const lead = await LeadService.createLead(req.user!.workspaceId, req.body);
      res.json(lead);
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
    console.log(`
  🚀 TL Connect running on http://localhost:${PORT}
  🛠  Mode: ${process.env.NODE_ENV || 'development'}
    `);
  });
}

startServer();
