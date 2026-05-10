import { supabaseAdmin } from '../../lib/supabaseAdmin.ts';

export class AnalyticsService {
  private static cache: Record<string, { data: any, timestamp: number }> = {};
  private static CACHE_TTL = 30000; // 30 seconds

  static async getWorkspaceMetrics(workspaceId: string) {
    const now = Date.now();
    const cached = this.cache[workspaceId];
    
    if (cached && (now - cached.timestamp < this.CACHE_TTL)) {
      return cached.data;
    }

    const [leadsRes, campaignsRes, statsRes] = await Promise.all([
      supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      supabaseAdmin.from('campaigns').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      supabaseAdmin.rpc('get_workspace_stats', { p_workspace_id: workspaceId })
    ]);

    // Fallback if the RPC doesn't exist (manual aggregation)
    let stats: any = statsRes.data;
    if (statsRes.error || !stats) {
      const { data } = await supabaseAdmin
        .from('campaigns')
        .select('stats_sent, stats_opened, stats_replied, stats_bounced')
        .eq('workspace_id', workspaceId);
      
      stats = (data || []).reduce((acc, curr) => ({
        statsSent: acc.statsSent + (curr.stats_sent || 0),
        statsOpened: acc.statsOpened + (curr.stats_opened || 0),
        statsReplied: acc.statsReplied + (curr.stats_replied || 0),
        statsBounced: acc.statsBounced + (curr.stats_bounced || 0),
      }), { statsSent: 0, statsOpened: 0, statsReplied: 0, statsBounced: 0 });
    }

    const totalSent = stats.statsSent || 0;
    const totalReplied = stats.statsReplied || 0;
    const totalBounced = stats.statsBounced || 0;

    const result = {
      leadsCount: leadsRes.count || 0,
      campaignsCount: campaignsRes.count || 0,
      totalSent,
      replyRate: totalSent > 0 ? (totalReplied / totalSent) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
    };

    this.cache[workspaceId] = {
      data: result,
      timestamp: Date.now()
    };

    return result;
  }

  static async getCampaignPerformance(campaignId: string) {
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error || !campaign) return null;

    const statsSent = (campaign as any).stats_sent || 0;
    const calculateRate = (dividend: number) => 
      statsSent > 0 ? ((dividend / statsSent) * 100).toFixed(1) + '%' : '0%';

    return {
      ...campaign,
      openRate: calculateRate((campaign as any).stats_opened || 0),
      replyRate: calculateRate((campaign as any).stats_replied || 0),
      bounceRate: calculateRate((campaign as any).stats_bounced || 0),
    };
  }
}
