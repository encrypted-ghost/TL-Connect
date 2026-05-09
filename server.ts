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
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@transferlegacy.com').toLowerCase().trim();
    const adminPass = (process.env.ADMIN_PASSWORD || 'change-me-immediately').trim();

    console.log('[Bootstrap] Starting admin sync...');
    console.log(`[Bootstrap] Supabase URL: ${process.env.SUPABASE_URL || 'MISSING'}`);
    console.log(`[Bootstrap] Supabase Secret: ${process.env.SUPABASE_SECRET_KEY ? 'PRESENT (starts with ' + process.env.SUPABASE_SECRET_KEY.substring(0, 4) + '...)' : 'MISSING'}`);
    console.log(`[Bootstrap] Target Admin Email: "${adminEmail}"`);
    console.log(`[Bootstrap] Admin Password Length: ${adminPass.length}`);

    if (adminPass.length < 6) {
      console.error('[Bootstrap] ERROR: Admin password is too short. Supabase requires at least 6 characters.');
    }

    try {
      // 1. Ensure Admin in Auth (DO THIS FIRST BEFORE DB TABLES TO ENSURE LOGIN WORKS)
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error('[Bootstrap] Failed to list auth users:', listError.message);
        throw listError;
      }
      
      let targetAuthUser = (users as any[]).find(u => u.email?.toLowerCase() === adminEmail);
      
      if (!targetAuthUser) {
        console.log(`[Bootstrap] Admin user ${adminEmail} not found in Auth, creating...`);
        const { data: { user: sbUser }, error: sbError } = await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: adminPass,
          email_confirm: true,
          user_metadata: { bootstrapped: true }
        });

        if (sbError) {
          console.error('[Bootstrap] Supabase auth creation error:', sbError.message);
          throw sbError;
        }
        targetAuthUser = sbUser;
        console.log(`[Bootstrap] Created admin auth user with ID: ${targetAuthUser?.id}`);
      } else {
        console.log(`[Bootstrap] Admin user ${adminEmail} exists in Auth ID: ${targetAuthUser.id}. Force-syncing password...`);
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          targetAuthUser.id, 
          { 
            password: adminPass,
            user_metadata: { 
              bootstrapped: true, 
              last_sync: new Date().toISOString(),
              sync_source: 'server_env'
            },
            email_confirm: true
          }
        );
        if (updateError) {
          console.error('[Bootstrap] FAILED to sync admin password:', updateError.message);
        } else {
          console.log('[Bootstrap] SUCCESS: Admin credentials synchronized with environment variables.');
        }
      }

      // VERIFICATION STEP:
      console.log('[Bootstrap] Verifying credentials via sign-in attempt...');
      const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({
        email: adminEmail,
        password: adminPass,
      });
      
      if (verifyError) {
        console.error(`[Bootstrap] VERIFICATION FAILED: "${verifyError.message}". This confirms why the frontend can't log in.`);
      } else {
        console.log('[Bootstrap] VERIFICATION SUCCESS: Credentials are valid and Auth is ready.');
      }

      // 2. Database Tables Sync
      // Catch schema errors gracefully so the server doesn't crash, but logged clearly
      let workspace;
      try {
        const { data: workspaces, error: wsError } = await supabaseAdmin.from('Workspace').select('*').limit(1);
        if (wsError) throw wsError;
        workspace = workspaces?.[0];

        if (!workspace) {
          const { data, error: wsInsertError } = await supabaseAdmin.from('Workspace').insert({
            id: 'default-workspace-id',
            name: 'Transfer Legacy HQ',
            slug: 'tl-hq',
            updatedAt: new Date().toISOString()
          }).select().single();
          
          if (wsInsertError) throw wsInsertError;
          workspace = data;
        }

        // Sync public User table entry
        if (workspace && targetAuthUser) {
          const { data: dbUser, error: dbFetchError } = await supabaseAdmin.from('User').select('*').eq('email', adminEmail).single();
          
          if (!dbUser) {
            await supabaseAdmin.from('User').insert({
              id: targetAuthUser.id,
              email: adminEmail,
              role: 'SUPER_ADMIN',
              workspaceId: workspace.id,
              name: 'System Super Admin',
              passwordHash: 'SB_MANAGED',
              updatedAt: new Date().toISOString()
            });
          } else {
            await supabaseAdmin.from('User').update({ 
              role: 'SUPER_ADMIN',
              id: targetAuthUser.id,
              updatedAt: new Date().toISOString()
            }).eq('email', adminEmail);
          }
          console.log('[Bootstrap] Database records synced successfully.');
        }
      } catch (dbErr: any) {
        console.error('[Bootstrap] DATABASE SYNC ERROR:', dbErr.message);
        if (dbErr.message?.includes('Invalid schema: connect')) {
          console.error('');
          console.error('===============================================================');
          console.error('CRITICAL: The "connect" schema is NOT EXPOSED in your Supabase!');
          console.error('To fix database errors, you MUST go to:');
          console.error('Supabase settings -> API -> Exposed schemas');
          console.error('And check the box for "connect", then save.');
          console.error('===============================================================');
          console.error('');
        }
      }
    } catch (err: any) {
      console.error('[Bootstrap] CRITICAL FAILURE:', err.message || err);
    }
  }
  await bootstrap();

  // --- API ROUTES ---

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const api = express.Router();
  api.use(authMiddleware);

  // Leads
  api.get('/leads', async (req, res) => {
    try {
      const data = await LeadService.getLeads(req.user!.workspaceId, req.query);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.post('/leads', async (req, res) => {
    try {
      const data = await LeadService.createLead(req.user!.workspaceId, req.body);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

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
