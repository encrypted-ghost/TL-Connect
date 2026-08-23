import { inngest } from '../../lib/inngest.client.ts';
import { supabaseAdmin } from '../../lib/supabaseAdmin.ts';
import { EmailProviderFactory } from '../email/email.factory.ts';

export const dispatchEmailWorkflow = inngest.createFunction(
  {
    id: 'dispatch-outreach-email',
    name: 'Dispatch Outreach Email',
    retries: 3,
    concurrency: {
      limit: 2,
      key: 'event.data.workspaceId',
    },
    throttle: {
      limit: 1,
      period: '2s',
      key: 'event.data.workspaceId',
    },
  },
  { event: 'outreach/email.dispatch' },
  async ({ event, step }) => {
    const { campaignId, leadId, workspaceId, toEmail, subject, html } = event.data;

    // Step 1: Pre-send validation (Suppression & Active check)
    const canSend = await step.run('validate-recipient-and-limits', async () => {
      // 1. Check suppression (unsubscribes)
      const { data: isUnsubscribed } = await supabaseAdmin
        .from('unsubscribes')
        .select('id')
        .eq('email', toEmail.toLowerCase().trim())
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (isUnsubscribed) {
        await supabaseAdmin.from('activities').insert({
          type: 'EMAIL_SUPPRESSED',
          description: `Email to ${toEmail} suppressed (unsubscribed)`,
          metadata: { campaignId, leadId, reason: 'unsubscribed' },
          lead_id: leadId,
          workspace_id: workspaceId,
        });
        return { ok: false, reason: 'unsubscribed' };
      }

      // 2. Check campaign status (if campaignId is present)
      if (campaignId) {
        const { data: campaign } = await supabaseAdmin
          .from('campaigns')
          .select('status')
          .eq('id', campaignId)
          .single();

        if (!campaign || campaign.status !== 'RUNNING') {
          return { ok: false, reason: 'campaign_stopped' };
        }
      }

      // 3. Check daily limits
      const emailConfig = await EmailProviderFactory.getProviderForWorkspace(workspaceId);
      const limit = emailConfig.dailyLimit || 1000;
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      const { count: sentToday } = await supabaseAdmin
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('type', 'EMAIL_SENT')
        .gte('created_at', startOfDay.toISOString());

      if ((sentToday || 0) >= limit) {
        return { ok: false, reason: 'daily_limit_reached' };
      }

      return { ok: true, emailConfig };
    });

    if (!canSend.ok) {
      return { skipped: true, reason: canSend.reason };
    }

    // Step 2: Send email via active provider
    const sendResult = await step.run('send-email-via-provider', async () => {
      const emailConfig = await EmailProviderFactory.getProviderForWorkspace(workspaceId);
      const provider = emailConfig.provider;

      const fromEmail = event.data.fromEmail || emailConfig.fromEmail;
      const fromName = event.data.fromName || emailConfig.fromName;

      const result = await provider.send({
        toEmail,
        fromEmail,
        fromName,
        subject: subject || 'Outreach',
        html: html || '<p>Hello</p>',
        metadata: {
          campaignId,
          leadId,
          workspaceId,
          provider: emailConfig.providerType,
        },
      });

      if (!result.success) {
        throw new Error(result.error || `Failed to send email via ${emailConfig.providerType}`);
      }

      // Update campaign stats
      if (campaignId) {
        const { data: campaign } = await supabaseAdmin
          .from('campaigns')
          .select('stats_sent')
          .eq('id', campaignId)
          .single();

        await supabaseAdmin
          .from('campaigns')
          .update({ stats_sent: (campaign?.stats_sent || 0) + 1 })
          .eq('id', campaignId);
      }

      // Log activity
      await supabaseAdmin.from('activities').insert({
        type: 'EMAIL_SENT',
        description: `Campaign email sent to ${toEmail} via ${emailConfig.providerType}`,
        metadata: {
          campaignId,
          leadId,
          provider: emailConfig.providerType,
          messageId: result.messageId,
        },
        lead_id: leadId,
        workspace_id: workspaceId,
      });

      return {
        success: true,
        messageId: result.messageId,
        provider: emailConfig.providerType,
      };
    });

    return sendResult;
  }
);
