import { supabaseAdmin } from '../../lib/supabaseAdmin.ts';

export class CampaignService {
  static async getCampaigns(workspaceId: string) {
    const { data, error } = await supabaseAdmin
      .from('Campaign')
      .select('*, template(name)')
      .eq('workspaceId', workspaceId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async createCampaign(workspaceId: string, data: any) {
    const { data: campaign, error } = await supabaseAdmin
      .from('Campaign')
      .insert({
        ...data,
        workspaceId,
        status: 'DRAFT'
      })
      .select()
      .single();

    if (error) throw error;
    return campaign;
  }

  static async startCampaign(campaignId: string, workspaceId: string) {
    const { data: campaign, error } = await supabaseAdmin
      .from('Campaign')
      .update({ 
        status: 'RUNNING',
        startedAt: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('workspaceId', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return campaign;
  }
}
