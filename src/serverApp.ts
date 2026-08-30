import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authMiddleware } from './lib/middleware';
import { requirePermission } from './lib/rbac.middleware';
import { PERMISSIONS } from './modules/auth/rbac.util';
import { AnalyticsService } from './modules/analytics/analytics.service';
import { CampaignService } from './modules/campaigns/campaign.service';
import { TemplateService } from './modules/templates/template.service';
import { LeadService } from './modules/leads/lead.service';
import { QueueService } from './modules/queue/queue.service';
import { EmailProviderFactory } from './modules/email/email.factory';
import { supabaseAdmin } from './lib/supabaseAdmin';
import { serve } from 'inngest/express';
import { inngest, inngestFunctions } from './modules/inngest/index';

export async function createApp() {
  const app = express();

  // Start background worker if not in serverless
  if (process.env.VERCEL !== '1' && !process.env.NOW_REGION) {
    QueueService.startWorker();
  }

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
      const authAdmin = (supabaseAdmin.auth as any).admin;
      if (!authAdmin) {
        console.warn('[Bootstrap] Supabase auth admin API not available. Skipping admin bootstrap.');
        return;
      }

      const { data: listData, error: listError } = await authAdmin.listUsers();
      if (listError) {
        console.error('[Bootstrap] Auth list failed:', listError.message);
        return;
      }
      
      const users = listData?.users || [];
      let targetAuthUser = (users as any[]).find(u => u.email?.toLowerCase() === adminEmail);
      
      if (!targetAuthUser) {
        const { data: createData, error: sbError } = await authAdmin.createUser({
          email: adminEmail,
          password: adminPass,
          email_confirm: true,
          user_metadata: { bootstrapped: true }
        });

        if (sbError) {
          console.error('[Bootstrap] Auth creation failed:', sbError.message);
          return;
        }
        targetAuthUser = createData?.user;
      } else {
        await authAdmin.updateUserById(targetAuthUser.id, { 
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

        // 3. Seed Templates
        console.log('[Bootstrap] Seeding templates...');
        await TemplateService.seedDefaults(workspace.id);
        console.log('[Bootstrap] Template seeding complete.');
      }
    } catch (err: any) {
      console.error('[Bootstrap] Error:', err.message || err);
    }
  }

  // Run bootstrap in the background to not block app startup
  bootstrap().catch(err => console.error('[Bootstrap Background Error]', err));

  // --- PUBLIC ENDPOINTS ---

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Unsubscribe Link Endpoint (Public)
  app.get('/api/unsubscribe', async (req, res) => {
    const { email, workspaceId } = req.query;
    if (!email || !workspaceId) {
      return res.status(400).send('<h1>Invalid unsubscribe link</h1>');
    }
    try {
      const { error } = await supabaseAdmin.from('unsubscribes').insert({
        email: String(email).toLowerCase().trim(),
        workspace_id: String(workspaceId)
      });
      if (error && error.code !== '23505') {
        throw error;
      }
      
      await supabaseAdmin.from('activities').insert({
        type: 'EMAIL_UNSUBSCRIBED',
        description: `${email} unsubscribed from campaign emails`,
        metadata: { email, source: 'unsubscribe_link' },
        workspace_id: String(workspaceId)
      });

      res.send(`
        <html>
          <head>
            <title>Unsubscribed</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f9fafb; color: #111827; }
              .card { background: white; padding: 2.5rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); text-align: center; max-width: 400px; width: 100%; border: 1px solid #e5e7eb; }
              h1 { font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 700; color: #1f2937; }
              p { color: #4b5563; font-size: 0.875rem; line-height: 1.5; margin-bottom: 1.5rem; }
              .logo { font-weight: 800; font-size: 1.25rem; color: #4f46e5; margin-bottom: 1.5rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">TL Connect</div>
              <h1>Unsubscribe Successful</h1>
              <p>You have been successfully unsubscribed from this workspace's mailing list. You will no longer receive marketing or outreach emails from us.</p>
            </div>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error('Unsubscribe error:', err);
      res.status(500).send('<h1>Something went wrong</h1>');
    }
  });

  // Mailjet Webhook Endpoint (Public)
  app.post('/api/webhooks/mailjet', async (req, res) => {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    
    for (const event of events) {
      try {
        const payloadStr = event.Payload || event.payload;
        if (!payloadStr) continue;
        
        let metadata: any;
        try {
          metadata = JSON.parse(payloadStr);
        } catch {
          continue;
        }
        
        const { campaignId, leadId, workspaceId, jobId } = metadata;
        if (!campaignId || !workspaceId) continue;
        
        const { data: campaign } = await supabaseAdmin
          .from('campaigns')
          .select('stats_opened, stats_clicked, stats_bounced')
          .eq('id', campaignId)
          .single();
        
        if (campaign) {
          const updateObj: any = {};
          if (event.event === 'open') updateObj.stats_opened = (campaign.stats_opened || 0) + 1;
          if (event.event === 'click') updateObj.stats_clicked = (campaign.stats_clicked || 0) + 1;
          if (event.event === 'bounce') updateObj.stats_bounced = (campaign.stats_bounced || 0) + 1;
          
          if (Object.keys(updateObj).length > 0) {
            await supabaseAdmin.from('campaigns').update(updateObj).eq('id', campaignId);
          }
        }
        
        let activityType = 'EMAIL_EVENT';
        let description = `Mailjet event: ${event.event} for ${event.email}`;
        
        if (event.event === 'open') {
          activityType = 'EMAIL_OPENED';
          description = `Email opened by ${event.email}`;
        } else if (event.event === 'click') {
          activityType = 'EMAIL_CLICKED';
          description = `Email link clicked by ${event.email}`;
        } else if (event.event === 'bounce') {
          activityType = 'EMAIL_BOUNCED';
          description = `Email bounced for ${event.email}`;
        } else if (event.event === 'spam') {
          activityType = 'EMAIL_SPAM';
          description = `Email reported as spam by ${event.email}`;
        } else if (event.event === 'blocked') {
          activityType = 'EMAIL_BLOCKED';
          description = `Email blocked for ${event.email}`;
        } else if (event.event === 'unsub') {
          activityType = 'EMAIL_UNSUBSCRIBED';
          description = `Email unsubscribed by ${event.email}`;
          
          await supabaseAdmin.from('unsubscribes').insert({
            email: String(event.email).toLowerCase().trim(),
            workspace_id: workspaceId
          }).select().maybeSingle();
        }
        
        await supabaseAdmin.from('activities').insert({
          type: activityType,
          description,
          metadata: { 
            campaignId, 
            leadId, 
            jobId,
            mailjetMessageId: event.MessageID,
            mailjetEvent: event.event,
            eventTime: event.time 
          },
          lead_id: leadId,
          workspace_id: workspaceId
        });
        
      } catch (err) {
        console.error('Error processing Mailjet event:', err);
      }
    }
    
    res.status(200).json({ status: 'ok' });
  });

  // Brevo Webhook Endpoint (Public)
  app.post('/api/webhooks/brevo', async (req, res) => {
    try {
      const event = req.body;
      const email = event.email;
      const eventType = event.event;

      if (email) {
        let activityType = 'EMAIL_EVENT';
        if (eventType === 'opened') activityType = 'EMAIL_OPENED';
        else if (eventType === 'click') activityType = 'EMAIL_CLICKED';
        else if (eventType?.includes('bounce')) activityType = 'EMAIL_BOUNCED';
        else if (eventType === 'unsubscribe') {
          activityType = 'EMAIL_UNSUBSCRIBED';
          await supabaseAdmin.from('unsubscribes').insert({
            email: String(email).toLowerCase().trim(),
            workspace_id: event.workspaceId || 'default-workspace-id'
          }).select().maybeSingle();
        }

        await supabaseAdmin.from('activities').insert({
          type: activityType,
          description: `Brevo event: ${eventType} for ${email}`,
          metadata: { ...event, provider: 'brevo' },
          workspace_id: event.workspaceId || 'default-workspace-id'
        });
      }
      res.status(200).json({ status: 'ok' });
    } catch (err: any) {
      console.error('Brevo webhook error:', err);
      res.status(200).json({ status: 'ok' });
    }
  });

  // Resend Webhook Endpoint (Public)
  app.post('/api/webhooks/resend', async (req, res) => {
    try {
      const { type, data } = req.body;
      const email = data?.to?.[0];
      if (email && type) {
        let activityType = 'EMAIL_EVENT';
        if (type === 'email.opened') activityType = 'EMAIL_OPENED';
        else if (type === 'email.clicked') activityType = 'EMAIL_CLICKED';
        else if (type === 'email.bounced') activityType = 'EMAIL_BOUNCED';
        else if (type === 'email.complained') activityType = 'EMAIL_SPAM';

        await supabaseAdmin.from('activities').insert({
          type: activityType,
          description: `Resend event: ${type} for ${email}`,
          metadata: { ...data, eventType: type, provider: 'resend' },
          workspace_id: data?.workspaceId || 'default-workspace-id'
        });
      }
      res.status(200).json({ status: 'ok' });
    } catch (err: any) {
      console.error('Resend webhook error:', err);
      res.status(200).json({ status: 'ok' });
    }
  });

  // SendGrid Webhook Endpoint (Public)
  app.post('/api/webhooks/sendgrid', async (req, res) => {
    try {
      const events = Array.isArray(req.body) ? req.body : [req.body];
      for (const event of events) {
        const email = event.email;
        const eventType = event.event;
        if (email) {
          let activityType = 'EMAIL_EVENT';
          if (eventType === 'open') activityType = 'EMAIL_OPENED';
          else if (eventType === 'click') activityType = 'EMAIL_CLICKED';
          else if (eventType === 'bounce' || eventType === 'dropped') activityType = 'EMAIL_BOUNCED';
          else if (eventType === 'spamreport') activityType = 'EMAIL_SPAM';

          await supabaseAdmin.from('activities').insert({
            type: activityType,
            description: `SendGrid event: ${eventType} for ${email}`,
            metadata: { ...event, provider: 'sendgrid' },
            workspace_id: event.workspaceId || 'default-workspace-id'
          });
        }
      }
      res.status(200).json({ status: 'ok' });
    } catch (err: any) {
      console.error('SendGrid webhook error:', err);
      res.status(200).json({ status: 'ok' });
    }
  });

  // Cron queue processing endpoint
  app.post('/api/queue/process', async (req, res) => {
    const cronSecret = req.headers['x-cron-secret'];
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized: Invalid cron secret' });
    }
    try {
      const processedCount = await QueueService.processBatch(10);
      res.json({ success: true, processed: processedCount });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Inngest Event Queue Handler
  app.use('/api/inngest', serve({ client: inngest, functions: inngestFunctions }));

  // --- API ROUTER (AUTHENTICATED) ---

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
  api.get('/leads', requirePermission(PERMISSIONS.LEADS_VIEW), async (req, res) => {
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

  api.post('/leads', requirePermission(PERMISSIONS.LEADS_EDIT), async (req, res) => {
    try {
      const data = await LeadService.createLead(req.user!.workspaceId, req.body);
      res.json(data);
    } catch (e: any) { 
      console.error('[API] POST /leads failure:', e);
      res.status(500).json({ error: e.message || 'Internal Server Error' }); 
    }
  });

  api.post('/leads/bulk', requirePermission(PERMISSIONS.LEADS_EDIT), async (req, res) => {
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

  api.delete('/leads/:id', requirePermission(PERMISSIONS.LEADS_DELETE), async (req, res) => {
    try {
      await LeadService.deleteLead(req.params.id, req.user!.workspaceId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.post('/leads/:id/send-email', requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      const { subject, html, fromName, fromEmail, providerId } = req.body;
      if (!subject || !html) {
        return res.status(400).json({ error: 'Subject and HTML content are required' });
      }
      const result = await LeadService.sendDirectEmail(req.params.id, req.user!.workspaceId, {
        subject,
        html,
        fromName,
        fromEmail,
        providerId
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to send direct email' });
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
  api.get('/campaigns', requirePermission(PERMISSIONS.CAMPAIGNS_VIEW), async (req, res) => {
    try {
      const data = await CampaignService.getCampaigns(req.user!.workspaceId);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.post('/campaigns', requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      const data = await CampaignService.createCampaign(req.user!.workspaceId, req.body);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.post('/campaigns/:id/start', requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      const data = await CampaignService.startCampaign(req.params.id, req.user!.workspaceId);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.post('/campaigns/:id/stop', requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      const data = await CampaignService.stopCampaign(req.params.id, req.user!.workspaceId);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.delete('/campaigns/:id', requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      await CampaignService.deleteCampaign(req.params.id, req.user!.workspaceId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Templates
  api.get('/templates', requirePermission(PERMISSIONS.CAMPAIGNS_VIEW), async (req, res) => {
    try {
      const data = await TemplateService.getTemplates(req.user!.workspaceId);
      res.json(data);
    } catch (e: any) { 
      console.error('[API] GET /templates failure:', e);
      res.status(500).json({ error: e.message || 'Internal Server Error' }); 
    }
  });

  api.post('/templates', requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      const data = await TemplateService.createTemplate(req.user!.workspaceId, req.body);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.patch('/templates/:id', requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      const data = await TemplateService.updateTemplate(req.params.id, req.user!.workspaceId, req.body);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.delete('/templates/:id', requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      await TemplateService.deleteTemplate(req.params.id, req.user!.workspaceId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.post('/templates/seed', requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      await TemplateService.seedDefaults(req.user!.workspaceId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Analytics
  api.get('/analytics/overview', requirePermission(PERMISSIONS.ANALYTICS_VIEW), async (req, res) => {
    try {
      const data = await AnalyticsService.getWorkspaceMetrics(req.user!.workspaceId);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.get('/activity', requirePermission(PERMISSIONS.ANALYTICS_VIEW), async (req, res) => {
    try {
      const { ActivityService } = await import('./modules/activity/activity.service');
      const data = await ActivityService.getWorkspaceActivity(req.user!.workspaceId);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.get('/logs/emails', requirePermission(PERMISSIONS.ANALYTICS_VIEW), async (req, res) => {
    try {
      const { ActivityService } = await import('./modules/activity/activity.service');
      const data = await ActivityService.getEmailLogs(req.user!.workspaceId, Number(req.query.limit) || 100);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.get('/inbox', requirePermission('inbox.view'), async (req, res) => {
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
  api.get('/domains', requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { data: domains, error } = await supabaseAdmin
        .from('domains')
        .select('*')
        .eq('workspace_id', req.user!.workspaceId);
      
      if (error) throw error;
      res.json(domains);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.post('/domains', requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
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

  api.delete('/domains/:id', requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
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
  api.get('/users', requirePermission('users.view'), async (req, res) => {
    try {
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, role, created_at')
        .eq('workspace_id', req.user!.workspaceId);
      
      if (error) throw error;
      res.json(users);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  api.delete('/users/:id', requirePermission(PERMISSIONS.USER_DELETE), async (req, res) => {
    try {
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

  // Email Providers (Settings)
  api.get('/settings/email-providers', requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('email_providers')
        .select('*')
        .eq('workspace_id', req.user!.workspaceId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.post('/settings/email-providers', requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { provider_type, name, from_email, from_name, reply_to, credentials, daily_limit, is_default } = req.body;

      if (!provider_type || !from_email || !from_name) {
        return res.status(400).json({ error: 'provider_type, from_email, and from_name are required' });
      }

      if (is_default) {
        await supabaseAdmin
          .from('email_providers')
          .update({ is_default: false })
          .eq('workspace_id', req.user!.workspaceId);
      }

      const { data, error } = await supabaseAdmin
        .from('email_providers')
        .insert({
          workspace_id: req.user!.workspaceId,
          provider_type,
          name: name || `${provider_type.toUpperCase()} Provider`,
          from_email,
          from_name,
          reply_to: reply_to || null,
          credentials: credentials || {},
          daily_limit: Number(daily_limit) || 1000,
          is_active: true,
          is_default: !!is_default,
        })
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.put('/settings/email-providers/:id', requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { id } = req.params;
      const { provider_type, name, from_email, from_name, reply_to, credentials, daily_limit, is_active, is_default } = req.body;

      if (is_default) {
        await supabaseAdmin
          .from('email_providers')
          .update({ is_default: false })
          .eq('workspace_id', req.user!.workspaceId);
      }

      const updateData: any = { updated_at: new Date().toISOString() };
      if (provider_type !== undefined) updateData.provider_type = provider_type;
      if (name !== undefined) updateData.name = name;
      if (from_email !== undefined) updateData.from_email = from_email;
      if (from_name !== undefined) updateData.from_name = from_name;
      if (reply_to !== undefined) updateData.reply_to = reply_to;
      if (credentials !== undefined) updateData.credentials = credentials;
      if (daily_limit !== undefined) updateData.daily_limit = Number(daily_limit);
      if (is_active !== undefined) updateData.is_active = is_active;
      if (is_default !== undefined) updateData.is_default = is_default;

      const { data, error } = await supabaseAdmin
        .from('email_providers')
        .update(updateData)
        .eq('id', id)
        .eq('workspace_id', req.user!.workspaceId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.delete('/settings/email-providers/:id', requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabaseAdmin
        .from('email_providers')
        .delete()
        .eq('id', id)
        .eq('workspace_id', req.user!.workspaceId);

      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.post('/settings/email-providers/:id/set-default', requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { id } = req.params;
      await supabaseAdmin
        .from('email_providers')
        .update({ is_default: false })
        .eq('workspace_id', req.user!.workspaceId);

      const { data, error } = await supabaseAdmin
        .from('email_providers')
        .update({ is_default: true, is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('workspace_id', req.user!.workspaceId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Test Email Sending
  api.post('/settings/email-providers/test', requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { provider_type, credentials, from_email, from_name, test_to_email } = req.body;
      const targetEmail = test_to_email || req.user!.email;

      if (!targetEmail) {
        return res.status(400).json({ error: 'Target email for test is required' });
      }

      const provider = EmailProviderFactory.createProvider(provider_type, credentials);
      const result = await provider.send({
        toEmail: targetEmail,
        fromEmail: from_email || 'outreach@transferlegacy.com',
        fromName: from_name || 'TL Connect Tester',
        subject: `[TL Connect] Test Email via ${provider_type?.toUpperCase()}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5;">TL Connect Test Message</h2>
            <p>Congratulations! Your <strong>${provider_type?.toUpperCase()}</strong> configuration is working properly.</p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 15px 0;">
            <p style="font-size: 12px; color: #64748b;">Timestamp: ${new Date().toISOString()}</p>
          </div>
        `,
        text: `TL Connect Test Message. Your ${provider_type?.toUpperCase()} configuration is working properly.`,
      });

      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error || 'Failed to send test email' });
      }

      res.json({ success: true, messageId: result.messageId, provider: result.provider });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.use('/api', api);

  return app;
}
