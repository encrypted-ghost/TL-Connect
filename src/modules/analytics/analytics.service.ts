import { supabaseAdmin } from '../../lib/supabaseAdmin.ts';

export class AnalyticsService {
  static async getWorkspaceMetrics(workspaceId: string) {
    const [leadsRes, campaignsRes, statsRes] = await Promise.all([
      supabaseAdmin.from('Lead').select('*', { count: 'exact', head: true }).eq('workspaceId', workspaceId),
      supabaseAdmin.from('Campaign').select('*', { count: 'exact', head: true }).eq('workspaceId', workspaceId),
      supabaseAdmin.rpc('get_workspace_stats', { p_workspace_id: workspaceId }) // This would be a custom Postgres function in Supabase
    ]);

    // Fallback if the RPC doesn't exist (manual aggregation)
    let stats: any = statsRes.data;
    if (statsRes.error || !stats) {
      const { data } = await supabaseAdmin
        .from('Campaign')
        .select('statsSent, statsOpened, statsReplied, statsBounced')
        .eq('workspaceId', workspaceId);
      
      stats = (data || []).reduce((acc, curr) => ({
        statsSent: acc.statsSent + (curr.statsSent || 0),
        statsOpened: acc.statsOpened + (curr.statsOpened || 0),
        statsReplied: acc.statsReplied + (curr.statsReplied || 0),
        statsBounced: acc.statsBounced + (curr.statsBounced || 0),
      }), { statsSent: 0, statsOpened: 0, statsReplied: 0, statsBounced: 0 });
    }

    const totalSent = stats.statsSent || 0;
    const totalReplied = stats.statsReplied || 0;
    const totalBounced = stats.statsBounced || 0;

    return {
      leadsCount: leadsRes.count || 0,
      campaignsCount: campaignsRes.count || 0,
      totalSent,
      replyRate: totalSent > 0 ? (totalReplied / totalSent) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
    };
  }

  static async getCampaignPerformance(campaignId: string) {
    const { data: campaign, error } = await supabaseAdmin
      .from('Campaign')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error || !campaign) return null;

    const calculateRate = (dividend: number) => 
      campaign.statsSent > 0 ? ((dividend / campaign.statsSent) * 100).toFixed(1) + '%' : '0%';

    return {
      ...campaign,
      openRate: calculateRate(campaign.statsOpened || 0),
      replyRate: calculateRate(campaign.statsReplied || 0),
      bounceRate: calculateRate(campaign.statsBounced || 0),
    };
  }
}
