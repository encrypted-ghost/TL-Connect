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
import { CampaignService } from './src/modules/campaigns/campaign.service';
import { TemplateService } from './src/modules/templates/template.service';

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

  // Campaigns
  api.get('/campaigns', async (req, res) => {
    try {
      const campaigns = await CampaignService.getCampaigns(req.user!.workspaceId);
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.get('/search', async (req, res) => {
    const q = req.query.q as string;
    if (!q || q.length < 2) return res.json({ leads: [], campaigns: [], templates: [] });
    
    try {
      const workspaceId = req.user!.workspaceId;
      const { db } = await import('./src/lib/supabase');
      
      const [leads, campaigns, templates] = await Promise.all([
        LeadService.getLeads(workspaceId, { search: q, limit: 5 }),
        db.from('Campaign').select('*').eq('workspaceId', workspaceId).ilike('name', `%${q}%`).limit(5),
        db.from('Template').select('*').eq('workspaceId', workspaceId).ilike('name', `%${q}%`).limit(5)
      ]);
      
      res.json({
        leads: leads,
        campaigns: campaigns.data || [],
        templates: templates.data || []
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.post('/campaigns', async (req, res) => {
    try {
      const campaign = await CampaignService.createCampaign(req.user!.workspaceId, req.body);
      res.json(campaign);
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

  api.get('/templates/:id', async (req, res) => {
    try {
      const template = await TemplateService.getTemplate(req.params.id, req.user!.workspaceId);
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.post('/templates', async (req, res) => {
    try {
      const template = await TemplateService.createTemplate(req.user!.workspaceId, req.body);
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.patch('/templates/:id', async (req, res) => {
    try {
      const template = await TemplateService.updateTemplate(req.params.id, req.user!.workspaceId, req.body);
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.delete('/templates/:id', async (req, res) => {
    try {
      await TemplateService.deleteTemplate(req.params.id, req.user!.workspaceId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  api.post('/templates/seed', async (req, res) => {
    try {
      await TemplateService.seedDefaults(req.user!.workspaceId);
      res.json({ success: true });
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
