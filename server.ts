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
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@transferlegacy.com').toLowerCase().trim();
    const adminPass = (process.env.ADMIN_PASSWORD || 'change-me-immediately').trim();

    console.log('[Bootstrap] Starting admin sync...');
    console.log(`[Bootstrap] Supabase URL: ${process.env.SUPABASE_URL ? 'PRESENT' : 'MISSING'}`);
    console.log(`[Bootstrap] Supabase Secret: ${process.env.SUPABASE_SECRET_KEY ? 'PRESENT' : 'MISSING'}`);
    console.log(`[Bootstrap] Target Admin: ${adminEmail}`);

    if (adminPass.length < 6) {
      console.warn('[Bootstrap] WARNING: Admin password is very short (< 6 chars). Supabase likely requires at least 6.');
    }

    try {
      // 1. Create workspace if none exists
      const { data: workspaces, error: wsError } = await supabaseAdmin.from('Workspace').select('*').limit(1);
      if (wsError) {
        console.error('[Bootstrap] Error querying Workspace:', wsError.message);
      }
      let workspace = workspaces?.[0];

      if (!workspace) {
        console.log('[Bootstrap] Creating default workspace...');
        const workspaceId = 'default-workspace-id';
        const { data, error: wsInsertError } = await supabaseAdmin.from('Workspace').insert({
          id: workspaceId,
          name: 'Transfer Legacy HQ',
          slug: 'tl-hq',
          updatedAt: new Date().toISOString()
        }).select().single();
        
        if (wsInsertError) {
          console.error('[Bootstrap] Failed to create workspace:', wsInsertError.message);
          // Try to fallback if it already exists but query missed it
          const { data: wsData } = await supabaseAdmin.from('Workspace').select('*').eq('slug', 'tl-hq').single();
          if (wsData) {
            workspace = wsData;
          } else {
            throw wsInsertError;
          }
        } else {
          workspace = data;
          console.log('[Bootstrap] Created default workspace:', workspace.id);
        }
      }

      // 2. Ensure Admin in Auth
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error('[Bootstrap] Failed to list auth users:', listError.message);
        throw listError;
      }
      
      const authUser = (users as any[]).find(u => u.email?.toLowerCase() === adminEmail);
      
      if (!authUser) {
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

        if (sbUser) {
          const { error: insertError } = await supabaseAdmin.from('User').insert({
            id: sbUser.id,
            email: adminEmail,
            role: 'SUPER_ADMIN',
            workspaceId: workspace.id,
            name: 'System Super Admin',
            passwordHash: 'SB_MANAGED', // Required by schema
            updatedAt: new Date().toISOString()
          });

          if (insertError) {
            console.error('[Bootstrap] DB insertion error for new admin user:', insertError.message);
          } else {
            console.log('[Bootstrap] Successfully bootstrapped super admin Auth and DB record:', adminEmail);
          }
        }
      } else {
        console.log(`[Bootstrap] Admin user ${adminEmail} exists in Auth ID: ${authUser.id}. Syncing...`);
        
        // Sync public User table entry
        const { data: dbUser, error: dbFetchError } = await supabaseAdmin.from('User').select('*').eq('email', adminEmail).single();
        
        if (!dbUser) {
          console.log(`[Bootstrap] Admin user ${adminEmail} not found in public User table or error: ${dbFetchError?.message}, inserting...`);
          const { error: insertError } = await supabaseAdmin.from('User').insert({
            id: authUser.id,
            email: adminEmail,
            role: 'SUPER_ADMIN',
            workspaceId: workspace.id,
            name: 'System Super Admin',
            passwordHash: 'SB_MANAGED',
            updatedAt: new Date().toISOString()
          });
          if (insertError) console.error('[Bootstrap] Failed to insert DB record for existing auth user:', insertError.message);
        } else {
          console.log(`[Bootstrap] Updating attributes for ${adminEmail} in public User table...`);
          await supabaseAdmin.from('User').update({ 
            role: 'SUPER_ADMIN',
            id: authUser.id,
            updatedAt: new Date().toISOString()
          }).eq('email', adminEmail);
        }
        
        // Force update password to match environment
        console.log(`[Bootstrap] Force-syncing password for ${adminEmail} to the one provided in ADMIN_PASSWORD...`);
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          authUser.id, 
          { 
            password: adminPass,
            email_confirm: true,
            user_metadata: { 
              bootstrapped: true, 
              last_sync: new Date().toISOString(),
              sync_source: 'server_env'
            }
          }
        );
        
        if (updateError) {
          console.error('[Bootstrap] FAILED to sync admin password:', updateError.message);
        } else {
          console.log('[Bootstrap] SUCCESS: Admin credentials synchronized with environment variables.');
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
