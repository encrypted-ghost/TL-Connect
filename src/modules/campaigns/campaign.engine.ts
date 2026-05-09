import { supabaseAdmin } from '@/src/lib/supabaseAdmin';
import { emailProvider } from '../email/email.provider';

export class CampaignEngine {
  static async processQueue() {
    const { data: jobs, error } = await supabaseAdmin
      .from('QueueJob')
      .select('*')
      .eq('status', 'PENDING')
      .lte('runAt', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('createdAt', { ascending: true })
      .limit(10);

    if (error || !jobs) return;

    for (const job of jobs) {
      await this.processJob(job.id);
    }
  }

  private static async processJob(jobId: string) {
    const { data: job, error: getError } = await supabaseAdmin
      .from('QueueJob')
      .select('*')
      .eq('id', jobId)
      .single();
      
    if (getError || !job) return;

    await supabaseAdmin
      .from('QueueJob')
      .update({ status: 'PROCESSING' })
      .eq('id', jobId);

    try {
      if (job.type === 'SEND_EMAIL') {
        const payload = job.payload as any;
        await emailProvider.send({
          from: payload.from,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          tags: [payload.campaignId],
          metadata: { jobId: job.id, leadId: payload.leadId },
        });

        // Update campaign stats (manual increment)
        const { data: campaign } = await supabaseAdmin
          .from('Campaign')
          .select('statsSent')
          .eq('id', payload.campaignId)
          .single();
        
        await supabaseAdmin
          .from('Campaign')
          .update({ statsSent: (campaign?.statsSent || 0) + 1 })
          .eq('id', payload.campaignId);

        // Record activity
        await supabaseAdmin
          .from('Activity')
          .insert({
            type: 'EMAIL_SENT',
            description: `Sent email to ${payload.to}`,
            leadId: payload.leadId,
            workspaceId: payload.workspaceId,
          });
      }

      await supabaseAdmin
        .from('QueueJob')
        .update({ status: 'COMPLETED' })
        .eq('id', jobId);
    } catch (error) {
      console.error('Job processing failed:', error);
      const retryCount = (job.retryCount || 0) + 1;
      
      await supabaseAdmin
        .from('QueueJob')
        .update({
          status: retryCount >= (job.maxRetries || 3) ? 'FAILED' : 'PENDING',
          retryCount,
          lastError: error instanceof Error ? error.message : String(error),
          runAt: new Date(Date.now() + Math.pow(2, retryCount) * 1000).toISOString(),
        })
        .eq('id', jobId);
    }
  }
}
