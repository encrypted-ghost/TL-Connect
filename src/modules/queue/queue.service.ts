import { supabaseAdmin } from '../../lib/supabaseAdmin.ts';
import { EmailProviderFactory } from '../email/email.factory.ts';

export class QueueService {
  private static isProcessing = false;

  /**
   * Add a job to the queue using Supabase
   */
  static async enqueue(type: string, payload: any, priority = 0) {
    const workspaceId = payload.workspaceId || payload.workspace_id || null;
    const { data, error } = await supabaseAdmin
      .from('queue_jobs')
      .insert([{ 
        type, 
        payload, 
        priority, 
        status: 'PENDING',
        run_at: new Date().toISOString(),
        workspace_id: workspaceId
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Process pending jobs with Supabase
   */
  static async processNext() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const { data: job, error: fetchError } = await supabaseAdmin
        .from('queue_jobs')
        .select('*')
        .eq('status', 'PENDING')
        .lte('run_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!job || fetchError) {
        this.isProcessing = false;
        return;
      }

      await this.processJob(job);
    } catch (error: any) {
      console.error('Queue Processing Error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a batch of pending jobs sequentially (used for cron)
   */
  static async processBatch(limit = 10): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    let processedCount = 0;
    try {
      const { data: jobs, error: fetchError } = await supabaseAdmin
        .from('queue_jobs')
        .select('*')
        .eq('status', 'PENDING')
        .lte('run_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(limit);

      if (fetchError || !jobs || jobs.length === 0) {
        return 0;
      }

      for (const job of jobs) {
        await this.processJob(job);
        processedCount++;
      }
    } catch (error: any) {
      console.error('Batch Queue Processing Error:', error);
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }

  /**
   * Core logic to process a single queue job
   */
  private static async processJob(job: any) {
    // Mark as processing
    await supabaseAdmin.from('queue_jobs').update({ status: 'PROCESSING', updated_at: new Date().toISOString() }).eq('id', job.id);

    let success = true;
    let lastError = null;
    const payload = job.payload as any;

    if (job.type === 'SEND_EMAIL') {
      const toEmail = payload.toEmail || payload.to;
      const fromEmail = payload.fromEmail || payload.from || process.env.SENDER_EMAIL || 'outreach@transferlegacy.com';
      const fromName = payload.fromName || process.env.SENDER_NAME || 'Transfer Legacy';

      // 1. CHECK: Is the campaign still running?
      const { data: campaign } = await supabaseAdmin
        .from('campaigns')
        .select('status, stats_sent')
        .eq('id', payload.campaignId)
        .single();

      if (!campaign || campaign.status !== 'RUNNING') {
        await supabaseAdmin.from('queue_jobs').update({ 
          status: 'COMPLETED',
          last_error: 'Campaign not running',
          updated_at: new Date().toISOString()
        }).eq('id', job.id);
        
        if (payload.campaignId) {
          await this.checkCampaignCompletion(payload.campaignId);
        }
        return;
      }

      // 2. CHECK: Suppression check (unsubscribe)
      const { data: isUnsubscribed } = await supabaseAdmin
        .from('unsubscribes')
        .select('id')
        .eq('email', toEmail)
        .eq('workspace_id', payload.workspaceId)
        .maybeSingle();

      if (isUnsubscribed) {
        await supabaseAdmin.from('queue_jobs').update({
          status: 'COMPLETED',
          last_error: 'Suppressed: Recipient unsubscribed',
          updated_at: new Date().toISOString()
        }).eq('id', job.id);

        await supabaseAdmin.from('activities').insert({
          type: 'EMAIL_SUPPRESSED',
          description: `Email to ${toEmail} suppressed (unsubscribed)`,
          metadata: { campaignId: payload.campaignId, leadId: payload.leadId, reason: 'unsubscribed' },
          lead_id: payload.leadId,
          workspace_id: payload.workspaceId
        });

        if (payload.campaignId) {
          await this.checkCampaignCompletion(payload.campaignId);
        }
        return;
      }

      // 3. CHECK: Daily limit check
      const { data: wsSettings } = await supabaseAdmin
        .from('workspace_settings')
        .select('email_daily_limit')
        .eq('workspace_id', payload.workspaceId)
        .maybeSingle();

      const limit = wsSettings?.email_daily_limit ?? 1000;
      
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      const { count: sentCount } = await supabaseAdmin
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', payload.workspaceId)
        .eq('type', 'EMAIL_SENT')
        .gte('created_at', startOfDay.toISOString());

      if ((sentCount || 0) >= limit) {
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 5, 0); // tomorrow at 00:00:05 UTC

        await supabaseAdmin.from('queue_jobs').update({
          status: 'PENDING',
          run_at: tomorrow.toISOString(),
          last_error: `Daily limit exceeded (${sentCount}/${limit}), postponed to tomorrow`,
          updated_at: new Date().toISOString()
        }).eq('id', job.id);
        return;
      }

      // 4. Send Email
      try {
        const provider = EmailProviderFactory.getProvider();
        const result = await provider.send({
          toEmail,
          fromEmail,
          fromName,
          subject: payload.subject || 'Outreach',
          html: payload.html,
          metadata: {
            jobId: job.id,
            campaignId: payload.campaignId,
            leadId: payload.leadId,
            workspaceId: payload.workspaceId
          }
        });
        
        success = result.success;
        lastError = result.error;

        if (success) {
          // Update campaign stats
          await supabaseAdmin
            .from('campaigns')
            .update({ stats_sent: (campaign.stats_sent || 0) + 1 })
            .eq('id', payload.campaignId);
          
          // Log activity
          await supabaseAdmin.from('activities').insert({
            type: 'EMAIL_SENT',
            description: `Campaign email sent to ${toEmail}`,
            metadata: { campaignId: payload.campaignId, leadId: payload.leadId },
            lead_id: payload.leadId,
            workspace_id: payload.workspaceId
          });
        }
      } catch (err: any) {
        success = false;
        lastError = err.message;
      }
    }

    if (success) {
      await supabaseAdmin.from('queue_jobs').update({ 
        status: 'COMPLETED',
        updated_at: new Date().toISOString()
      }).eq('id', job.id);
    } else {
      const newRetryCount = (job.retry_count || 0) + 1;
      const maxRetries = job.max_retries || 3;
      const status = newRetryCount >= maxRetries ? 'FAILED' : 'PENDING';
      
      await supabaseAdmin.from('queue_jobs').update({ 
        status,
        retry_count: newRetryCount,
        last_error: lastError,
        run_at: new Date(Date.now() + Math.pow(2, newRetryCount) * 5000).toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', job.id);
    }

    if (payload.campaignId) {
      await this.checkCampaignCompletion(payload.campaignId);
    }
  }

  /**
   * Helper to verify and update campaign status if all enqueued jobs are processed
   */
  static async checkCampaignCompletion(campaignId: string) {
    const { count, error } = await supabaseAdmin
      .from('queue_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('payload->>campaignId', campaignId)
      .in('status', ['PENDING', 'PROCESSING']);

    if (!error && count === 0) {
      await supabaseAdmin
        .from('campaigns')
        .update({ 
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);
    }
  }

  /**
   * Start the worker loop
   */
  static startWorker() {
    setInterval(async () => {
      await this.processNext();
    }, 15000); // 15 seconds to avoid excessive rates
  }
}
