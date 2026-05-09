import { db } from '../../lib/supabase';

export class CampaignService {
  static async getCampaigns(workspaceId: string) {
    const { data, error } = await db
      .from('Campaign')
      .select(`
        *,
        leads:CampaignLead(count)
      `)
      .eq('workspaceId', workspaceId)
      .order('createdAt', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  static async createCampaign(workspaceId: string, data: any) {
    const { data: campaign, error } = await db
      .from('Campaign')
      .insert([{
        ...data,
        workspaceId,
        status: 'DRAFT',
        statsSent: 0,
        statsReplied: 0,
        statsBounced: 0
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return campaign;
  }

  /**
   * Start a campaign and enqueue initial emails
   */
  static async startCampaign(campaignId: string, workspaceId: string) {
    const { data: campaign, error: cError } = await db
      .from('Campaign')
      .update({ status: 'RUNNING', startedAt: new Date().toISOString() })
      .eq('id', campaignId)
      .eq('workspaceId', workspaceId)
      .select()
      .single();

    if (cError) throw new Error(cError.message);

    // Fetch leads for this campaign
    const { data: campaignLeads, error: lError } = await db
      .from('CampaignLead')
      .select('lead:Lead(*)')
      .eq('campaignId', campaignId);

    if (lError) throw new Error(lError.message);

    // Enqueue sending job for each lead (simplified for MVP)
    // In production, we'd use a sequence and wait times.
    for (const entry of campaignLeads) {
      if (entry.lead) {
        // Here we would call QueueService.enqueue('SEND_EMAIL', ...)
        console.log(`Enqueuing email for ${entry.lead.email} in campaign ${campaign.name}`);
      }
    }

    return campaign;
  }
}
