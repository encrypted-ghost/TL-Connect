import { supabaseAdmin } from '../../lib/supabaseAdmin.ts';
import { QueueService } from '../queue/queue.service.ts';
import { TemplateService } from '../templates/template.service.ts';

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

    // 3. Mark Campaign as RUNNING
    const { error: uError } = await supabaseAdmin
      .from('campaigns')
      .update({ 
        status: 'RUNNING',
        started_at: new Date().toISOString()
      })
      .eq('id', campaignId);
    
    if (uError) throw uError;

    // 4. Enqueue SEND_EMAIL jobs for each lead
    const template = campaign.template as any;
    for (const lead of (leads || [])) {
      // Basic body rendering
      let html = template.body_html || '';
      html = html.replace(/\{\{first_name\}\}/g, lead.first_name || 'there');
      html = html.replace(/\{\{last_name\}\}/g, lead.last_name || '');
      html = html.replace(/\{\{email\}\}/g, lead.email);

      await QueueService.enqueue('SEND_EMAIL', {
        campaignId: campaign.id,
        workspaceId,
        leadId: lead.id,
        to: lead.email,
        subject: template.subject || 'Outreach',
        html,
        from: `outreach@${workspaceId}.transferlegacy.com` // Placeholder logic for domain
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
