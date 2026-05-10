import 'dotenv/config';
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
import { LeadService } from './src/modules/leads/lead.service.ts';
import { QueueService } from './src/modules/queue/queue.service.ts';
import { supabaseAdmin } from './src/lib/supabaseAdmin.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Start background worker
  QueueService.startWorker();

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // --- BOOTSTRAP ---
  async function bootstrap() {
    try {
      const adminEmail = (process.env.ADMIN_EMAIL || 'admin@transferlegacy.com').toLowerCase().trim();
      const adminPass = (process.env.ADMIN_PASSWORD || 'change-me-immediately').trim();

      console.log('[Bootstrap] Starting admin sync...');
      
      if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SECRET_KEY && !process.env.VITE_SUPABASE_ANON_KEY)) {
        console.warn('[Bootstrap] Missing Supabase credentials. Background sync skipped.');
        return;
      }

      // 1. Ensure Admin in Auth
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error('[Bootstrap] Auth list failed:', listError.message);
        return;
      }
      
      let targetAuthUser = (users as any[]).find(u => u.email?.toLowerCase() === adminEmail);
      
      if (!targetAuthUser) {
        const { data: { user: sbUser }, error: sbError } = await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: adminPass,
          email_confirm: true,
          user_metadata: { bootstrapped: true }
        });

        if (sbError) {
          console.error('[Bootstrap] Auth creation failed:', sbError.message);
          return;
        }
        targetAuthUser = sbUser;
      } else {
        await supabaseAdmin.auth.admin.updateUserById(targetAuthUser.id, { 
          password: adminPass,
          email_confirm: true
        });
      }

      // 2. Database Tables Sync
      const { data: workspaces, error: wsError } = await supabaseAdmin.from('workspaces').select('*').limit(1);
      if (wsError) {
        console.error('[Bootstrap] Workspace fetch error:', wsError.message);
        if (wsError.message?.includes('schema cache')) {
          console.error('[Bootstrap] CRITICAL: Tables missing in Supabase. Did you run schema.sql?');
        }
      }
      let workspace = workspaces?.[0];

      if (!workspace) {
        const { data, error: insertWsError } = await supabaseAdmin.from('workspaces').insert({
          id: 'default-workspace-id',
          name: 'Transfer Legacy HQ',
          slug: 'tl-hq',
          updated_at: new Date().toISOString()
        }).select().single();
        
        if (insertWsError) {
          console.error('[Bootstrap] Workspace creation failed:', insertWsError.message);
        }
        workspace = data;
      }

      if (workspace && targetAuthUser) {
        const { data: dbUser, error: fetchUserError } = await supabaseAdmin.from('users').select('*').eq('email', adminEmail).maybeSingle();
        if (fetchUserError) {
          console.error('[Bootstrap] User fetch error:', fetchUserError.message);
        }
        
        if (!dbUser) {
          const { error: insertUserError } = await supabaseAdmin.from('users').insert({
            id: targetAuthUser.id,
            email: adminEmail,
            role: 'SUPER_ADMIN',
            workspace_id: workspace.id,
            name: 'System Super Admin',
            password_hash: 'SB_MANAGED',
            updated_at: new Date().toISOString()
          });
          if (insertUserError) {
            console.error('[Bootstrap] user creation failed:', insertUserError.message);
          }
        } else {
          await supabaseAdmin.from('users').update({ role: 'SUPER_ADMIN' }).eq('email', adminEmail);
        }
        console.log('[Bootstrap] Admin sync complete.');
      }
    } catch (err: any) {
      console.error('[Bootstrap] Error:', err.message || err);
    }
  }

  // Run bootstrap in the background to not block app startup
  bootstrap().catch(err => console.error('[Bootstrap Background Error]', err));

  // --- API ROUTES ---

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const api = express.Router();
  api.use(authMiddleware);

  // Health check
  api.get('/health', async (req, res) => {
    try {
      const results: any = {};
      
      const tables = ['users', 'workspaces', 'leads', 'templates', 'campaigns'];
      for (const table of tables) {
        const { data, error, count } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
        results[table] = error ? { error: error.message, code: error.code } : { ok: true, count };
      }
      
      res.json({ 
        status: 'ok',
        database: results,
        env: {
          hasUrl: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
          hasSecretKey: !!process.env.SUPABASE_SECRET_KEY,
          hasAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
          adminEmail: process.env.ADMIN_EMAIL || 'admin@transferlegacy.com'
        }
      });
    } catch (e: any) {
      res.status(500).json({ status: 'error', error: e.message });
    }
  });

  // Leads
  api.get('/leads', async (req, res) => {
    try {
      const data = await LeadService.getLeads(req.user!.workspaceId, req.query);
      res.json(data);
    } catch (e: any) { 
      console.error('[API] GET /leads failure:', {
        message: e.message,
        stack: e.stack,
        workspaceId: req.user?.workspaceId
      });
      res.status(500).json({ error: e.message || 'Internal Server Error' }); 
    }
  });

  api.post('/leads', async (req, res) => {
    try {
      const data = await LeadService.createLead(req.user!.workspaceId, req.body);
      res.json(data);
    } catch (e: any) { 
      console.error('[API] POST /leads failure:', e);
      res.status(500).json({ error: e.message || 'Internal Server Error' }); 
    }
  });

  api.post('/leads/bulk', async (req, res) => {
    try {
      const { leads } = req.body;
      if (!Array.isArray(leads)) {
        return res.status(400).json({ error: 'Leads must be an array' });
      }
      const data = await LeadService.bulkCreateLeads(req.user!.workspaceId, leads);
      res.json(data);
    } catch (e: any) {
      console.error('[API] POST /leads/bulk failure:', e);
      res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
  });

  api.delete('/leads/:id', async (req, res) => {
    try {
      await LeadService.deleteLead(req.params.id, req.user!.workspaceId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Profile
  api.get('/auth/me', async (req, res) => {
    res.json(req.user);
  });

  // Login Logging
  api.post('/auth/log-login', async (req, res) => {
    try {
      await supabaseAdmin.from('login_logs').insert({
        user_id: req.user!.id,
        email: req.user!.email,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
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

  api.post('/campaigns', async (req, res) => {
    try {
      const data = await CampaignService.createCampaign(req.user!.workspaceId, req.body);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.post('/campaigns/:id/start', async (req, res) => {
    try {
      const data = await CampaignService.startCampaign(req.params.id, req.user!.workspaceId);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.delete('/campaigns/:id', async (req, res) => {
    try {
      await CampaignService.deleteCampaign(req.params.id, req.user!.workspaceId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Templates
  api.get('/templates', async (req, res) => {
    try {
      const data = await TemplateService.getTemplates(req.user!.workspaceId);
      res.json(data);
    } catch (e: any) { 
      console.error('[API] GET /templates failure:', e);
      res.status(500).json({ error: e.message || 'Internal Server Error' }); 
    }
  });

  api.post('/templates', async (req, res) => {
    try {
      const data = await TemplateService.createTemplate(req.user!.workspaceId, req.body);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.patch('/templates/:id', async (req, res) => {
    try {
      const data = await TemplateService.updateTemplate(req.params.id, req.user!.workspaceId, req.body);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.delete('/templates/:id', async (req, res) => {
    try {
      await TemplateService.deleteTemplate(req.params.id, req.user!.workspaceId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.post('/templates/seed', async (req, res) => {
    try {
      await TemplateService.seedDefaults(req.user!.workspaceId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Analytics
  api.get('/analytics/overview', async (req, res) => {
    try {
      const data = await AnalyticsService.getWorkspaceMetrics(req.user!.workspaceId);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.get('/activity', async (req, res) => {
    try {
      const { ActivityService } = await import('./src/modules/activity/activity.service.ts');
      const data = await ActivityService.getWorkspaceActivity(req.user!.workspaceId);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.get('/inbox', async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('activities')
        .select('*')
        .eq('workspace_id', req.user!.workspaceId)
        .eq('type', 'REPLY')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Domains
  api.get('/domains', async (req, res) => {
    try {
      const { data: domains, error } = await supabaseAdmin
        .from('domains')
        .select('*')
        .eq('workspace_id', req.user!.workspaceId);
      
      if (error) throw error;
      res.json(domains);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.post('/domains', async (req, res) => {
    try {
      const { data: domain, error } = await supabaseAdmin
        .from('domains')
        .insert({
          ...req.body,
          workspace_id: req.user!.workspaceId
        })
        .select()
        .single();

      if (error) throw error;
      res.json(domain);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.delete('/domains/:id', async (req, res) => {
    try {
      const { error } = await supabaseAdmin
        .from('domains')
        .delete()
        .eq('id', req.params.id)
        .eq('workspace_id', req.user!.workspaceId);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Users (Team)
  api.get('/users', async (req, res) => {
    try {
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, role, created_at')
        .eq('workspace_id', req.user!.workspaceId);
      
      if (error) throw error;
      res.json(users);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.delete('/users/:id', async (req, res) => {
    try {
      // Check if trying to delete self
      if (req.params.id === req.user!.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', req.params.id)
        .eq('workspace_id', req.user!.workspaceId);
      
      if (error) throw error;
      res.json({ success: true });
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
