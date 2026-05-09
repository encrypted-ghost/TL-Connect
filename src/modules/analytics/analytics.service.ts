import { db } from '../../lib/supabase';

export class AnalyticsService {
  /**
   * Get workspace metrics using Supabase REST API
   */
  static async getWorkspaceMetrics(workspaceId: string) {
    // Lead Count
    const { count: leadsCount } = await db
      .from('Lead')
      .select('*', { count: 'exact', head: true })
      .eq('workspaceId', workspaceId)
      .eq('isDeleted', false);

    // Campaign Stats
    const { data: campaignStats } = await db
      .from('Campaign')
      .select('statsSent, statsReplied, statsBounced')
      .eq('workspaceId', workspaceId);

    const totalSent = campaignStats?.reduce((acc, c) => acc + (c.statsSent || 0), 0) || 0;
    const totalReplies = campaignStats?.reduce((acc, c) => acc + (c.statsReplied || 0), 0) || 0;
    const totalBounces = campaignStats?.reduce((acc, c) => acc + (c.statsBounced || 0), 0) || 0;

    return {
      leadsCount: leadsCount || 0,
      campaignsCount: campaignStats?.length || 0,
      totalSent,
      replyRate: totalSent > 0 ? (totalReplies / totalSent) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounces / totalSent) * 100 : 0,
    };
  }

  static async getCampaignPerformance(campaignId: string) {
    const { data: stats, error } = await db
      .from('Campaign')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!stats || error) return null;

    const calculateRate = (dividend: number) => 
      stats.statsSent > 0 ? ((dividend / stats.statsSent) * 100).toFixed(1) + '%' : '0%';

    return {
      ...stats,
      openRate: calculateRate(stats.statsOpened),
      clickRate: calculateRate(stats.statsClicked),
      replyRate: calculateRate(stats.statsReplied),
      bounceRate: calculateRate(stats.statsBounced),
    };
  }
}
