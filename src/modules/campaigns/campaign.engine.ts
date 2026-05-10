import { supabaseAdmin } from '../../lib/supabaseAdmin.ts';
import { emailProvider } from '../email/email.provider.ts';

export class CampaignEngine {
  static async processQueue() {
    const { data: jobs, error } = await supabaseAdmin
      .from('queue_jobs')
      .select('*')
      .eq('status', 'PENDING')
      .lte('run_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    if (error || !jobs) return;

    for (const job of jobs) {
      await this.processJob(job.id);
    }
  }

  private static async processJob(jobId: string) {
    const { data: job, error: getError } = await supabaseAdmin
      .from('queue_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
      
    if (getError || !job) return;

    await supabaseAdmin
      .from('queue_jobs')
      .update({ status: 'PROCESSING' })
      .eq('id', jobId);

    try {
      if (job.type === 'SEND_EMAIL') {
        const payload = job.payload as any;
        await emailProvider.send({
          fromEmail: payload.fromEmail || payload.from,
          fromName: payload.fromName || 'Transfer Legacy',
          toEmail: payload.toEmail || payload.to,
          subject: payload.subject,
          html: payload.html,
          tags: [payload.campaignId],
          metadata: { jobId: job.id, leadId: payload.leadId },
        });

        // Update campaign stats (manual increment)
        const { data: campaign } = await supabaseAdmin
          .from('campaigns')
          .select('stats_sent')
          .eq('id', payload.campaignId)
          .single();
        
        await supabaseAdmin
          .from('campaigns')
          .update({ stats_sent: (campaign?.stats_sent || 0) + 1 })
          .eq('id', payload.campaignId);

        // Record activity
        await supabaseAdmin
          .from('activities')
          .insert({
            type: 'EMAIL_SENT',
            description: `Sent email to ${payload.to}`,
            lead_id: payload.leadId,
            workspace_id: payload.workspaceId,
          });
      }

      await supabaseAdmin
        .from('queue_jobs')
        .update({ status: 'COMPLETED' })
        .eq('id', jobId);
    } catch (error) {
      console.error('Job processing failed:', error);
      const retryCount = (job.retry_count || 0) + 1;
      
      await supabaseAdmin
        .from('queue_jobs')
        .update({
          status: retryCount >= (job.max_retries || 3) ? 'FAILED' : 'PENDING',
          retry_count: retryCount,
          last_error: error instanceof Error ? error.message : String(error),
          run_at: new Date(Date.now() + Math.pow(2, retryCount) * 1000).toISOString(),
        })
        .eq('id', jobId);
    }
  }
}
