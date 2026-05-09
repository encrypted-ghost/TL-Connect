import { supabaseAdmin } from '../../lib/supabaseAdmin.ts';

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
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .update({ 
        status: 'RUNNING',
        started_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return campaign;
  }
}
