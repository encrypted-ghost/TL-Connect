import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { QueueService } from '../queue/queue.service';
import { TemplateService } from '../templates/template.service';

export class CampaignService {
  static async getCampaigns(workspaceId: string) {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*, template:templates(name)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async createCampaign(workspaceId: string, data: any) {
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .insert({
        name: data.name,
        template_id: data.templateId || data.template_id,
        workspace_id: workspaceId,
        status: 'DRAFT'
      })
      .select()
      .single();

    if (error) throw error;
    return campaign;
  }

  static async startCampaign(campaignId: string, workspaceId: string) {
    // 1. Get Campaign and Template details
    const { data: campaign, error: cError } = await supabaseAdmin
      .from('campaigns')
      .select('*, template:templates(*)')
      .eq('id', campaignId)
      .eq('workspace_id', workspaceId)
      .single();

    if (cError || !campaign) throw new Error('Campaign not found');
    if (!campaign.template) throw new Error('Campaign has no template');

    // 2. Fetch all active leads for this workspace
    const { data: leads, error: lError } = await supabaseAdmin
      .from('leads')
      .select('id, email, first_name, last_name')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);
    
    if (lError) throw lError;

    // 3. Fetch unsubscribed emails for this workspace to pre-filter
    const { data: unsubscribed } = await supabaseAdmin
      .from('unsubscribes')
      .select('email')
      .eq('workspace_id', workspaceId);

    const unsubscribedEmails = new Set((unsubscribed || []).map(u => u.email.toLowerCase().trim()));

    // 4. Mark Campaign as RUNNING
    const { error: uError } = await supabaseAdmin
      .from('campaigns')
      .update({ 
        status: 'RUNNING',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);
    
    if (uError) throw uError;

    // 5. Enqueue SEND_EMAIL jobs & Trigger Inngest Event Workflow
    const template = campaign.template as any;
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const fromEmail = process.env.SENDER_EMAIL || 'outreach@transferlegacy.com';
    const fromName = process.env.SENDER_NAME || 'Transfer Legacy';

    // Trigger Inngest Event Queue
    try {
      const { inngest } = await import('../../lib/inngest.client');
      await inngest.send({
        name: 'outreach/campaign.started',
        data: { campaignId, workspaceId },
      });
    } catch (err) {
      console.warn('[CampaignService] Inngest event trigger warning, using fallback queue:', err);
    }

    for (const lead of (leads || [])) {
      if (unsubscribedEmails.has(lead.email.toLowerCase().trim())) {
        // Skip enqueuing if unsubscribed (pre-filter)
        continue;
      }

      // Basic body rendering
      let html = template.body_html || '';
      html = html.replace(/\{\{first_name\}\}/g, lead.first_name || 'there');
      html = html.replace(/\{\{last_name\}\}/g, lead.last_name || '');
      html = html.replace(/\{\{email\}\}/g, lead.email);

      // Append unsubscribe footer
      const unsubscribeLink = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(lead.email)}&workspaceId=${workspaceId}`;
      const unsubscribeFooter = `
        <br/><br/>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280; font-family: sans-serif; line-height: 1.5;">
          You are receiving this outreach email from ${fromName}.<br/>
          To stop receiving emails, you can <a href="${unsubscribeLink}" style="color: #4f46e5; text-decoration: underline;" target="_blank">unsubscribe here</a>.
        </p>
      `;
      html += unsubscribeFooter;

      await QueueService.enqueue('SEND_EMAIL', {
        campaignId: campaign.id,
        workspaceId,
        leadId: lead.id,
        toEmail: lead.email,
        fromEmail,
        fromName,
        subject: template.subject || 'Outreach',
        html
      });
    }

    return campaign;
  }

  static async stopCampaign(campaignId: string, workspaceId: string) {
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .update({ 
        status: 'PAUSED',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return campaign;
  }

  static async deleteCampaign(id: string, workspaceId: string) {
    const { error } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return { success: true };
  }
}
