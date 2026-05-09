import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authMiddleware } from './src/lib/middleware.ts';
import { AnalyticsService } from './src/modules/analytics/analytics.service.ts';
import { CampaignService } from './src/modules/campaigns/campaign.service.ts';
import { TemplateService } from './src/modules/templates/template.service.ts';
import { supabaseAdmin } from './src/lib/supabaseAdmin.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // --- BOOTSTRAP ---
  async function bootstrap() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@transferlegacy.com';
    const adminPass = process.env.ADMIN_PASSWORD || 'change-me-immediately';

    try {
      // 1. Create workspace if none exists
      const { data: workspaces, error: wsError } = await supabaseAdmin.from('Workspace').select('*').limit(1);
      let workspace = workspaces?.[0];

      if (!workspace) {
        const { data, error } = await supabaseAdmin.from('Workspace').insert({
          name: 'Transfer Legacy HQ',
          slug: 'tl-hq',
        }).select().single();
        
        if (error) throw error;
        workspace = data;
        console.log('Created default workspace');
      }

      // 2. Check if admin exists
      const { data: user, error: userError } = await supabaseAdmin.from('User').select('*').eq('email', adminEmail).single();
      
      if (!user) {
        // Create in Supabase Auth
        const { data: sbUser, error: sbError } = await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: adminPass,
          email_confirm: true
        });

        if (sbError && !sbError.message.includes('already exists')) {
          console.error('Supabase bootstrap error:', sbError);
        }

        const { error: insertError } = await supabaseAdmin.from('User').insert({
          email: adminEmail,
          passwordHash: 'SUPABASE_MANAGED',
          role: 'SUPER_ADMIN',
          workspaceId: workspace.id,
          name: 'System Super Admin'
        });

        if (insertError) throw insertError;
        console.log('Bootstrapped super admin account:', adminEmail);
      } else if (user.role !== 'SUPER_ADMIN') {
        // Ensure the env-defined admin is always SUPER_ADMIN
        await supabaseAdmin.from('User').update({ role: 'SUPER_ADMIN' }).eq('email', adminEmail);
      }
    } catch (err) {
      console.error('Bootstrap failed:', err);
    }
  }
  await bootstrap();

  // --- API ROUTES ---

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const api = express.Router();
  api.use(authMiddleware);

  // Profile
  api.get('/auth/me', async (req, res) => {
    res.json(req.user);
  });

  // Login Logging
  api.post('/auth/log-login', async (req, res) => {
    try {
      await supabaseAdmin.from('LoginLog').insert({
        userId: req.user!.id,
        email: req.user!.email,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'SUCCESS'
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to log login' });
    }
  });

  // Campaigns
  api.get('/campaigns', async (req, res) => {
    try {
      const data = await CampaignService.getCampaigns(req.user!.workspaceId);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Templates
  api.get('/templates', async (req, res) => {
    try {
      const data = await TemplateService.getTemplates(req.user!.workspaceId);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Analytics
  api.get('/analytics/overview', async (req, res) => {
    try {
      const data = await AnalyticsService.getWorkspaceMetrics(req.user!.workspaceId);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Domains
  api.get('/domains', async (req, res) => {
    try {
      const { data: domains, error } = await supabaseAdmin
        .from('Domain')
        .select('*')
        .eq('workspaceId', req.user!.workspaceId);
      
      if (error) throw error;
      res.json(domains);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.post('/domains', async (req, res) => {
    try {
      const { data: domain, error } = await supabaseAdmin
        .from('Domain')
        .insert({
          ...req.body,
          workspaceId: req.user!.workspaceId
        })
        .select()
        .single();

      if (error) throw error;
      res.json(domain);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Users (Team)
  api.get('/users', async (req, res) => {
    try {
      const { data: users, error } = await supabaseAdmin
        .from('User')
        .select('id, email, name, role, createdAt')
        .eq('workspaceId', req.user!.workspaceId);
      
      if (error) throw error;
      res.json(users);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.use('/api', api);

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
