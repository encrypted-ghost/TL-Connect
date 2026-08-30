import { supabaseAdmin } from '../../lib/supabaseAdmin';

export class AnalyticsService {
  private static cache: Record<string, { data: any, timestamp: number }> = {};
  private static CACHE_TTL = 10000; // 10 seconds

  static async getWorkspaceMetrics(workspaceId: string) {
    const now = Date.now();
    const cached = this.cache[workspaceId];
    
    if (cached && (now - cached.timestamp < this.CACHE_TTL)) {
      return cached.data;
    }

    try {
      const [leadsRes, campaignsRes, activitiesRes] = await Promise.all([
        supabaseAdmin.from('leads').select('status', { count: 'exact' }).eq('workspace_id', workspaceId).eq('is_deleted', false),
        supabaseAdmin.from('campaigns').select('stats_sent, stats_opened, stats_clicked, stats_replied, stats_bounced, status').eq('workspace_id', workspaceId),
        supabaseAdmin.from('activities').select('type').eq('workspace_id', workspaceId).limit(1000)
      ]);

      // Aggregate campaign stats
      const campaigns = campaignsRes.data || [];
      const campStats = campaigns.reduce((acc, curr) => ({
        sent: acc.sent + (curr.stats_sent || 0),
        opened: acc.opened + (curr.stats_opened || 0),
        clicked: acc.clicked + (curr.stats_clicked || 0),
        replied: acc.replied + (curr.stats_replied || 0),
        bounced: acc.bounced + (curr.stats_bounced || 0),
      }), { sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 });

      // Aggregate activity logs
      const activities = activitiesRes.data || [];
      const actSent = activities.filter(a => a.type === 'EMAIL_SENT').length;
      const actOpened = activities.filter(a => a.type === 'EMAIL_OPENED').length;
      const actClicked = activities.filter(a => a.type === 'EMAIL_CLICKED').length;
      const actReplied = activities.filter(a => a.type === 'REPLY').length;
      const actBounced = activities.filter(a => a.type === 'EMAIL_BOUNCED').length;
      const actFailed = activities.filter(a => a.type === 'EMAIL_FAILED').length;

      // Combined totals (maximum of campaign counters or logged activity count)
      const totalSent = Math.max(campStats.sent, actSent);
      const totalOpened = Math.max(campStats.opened, actOpened);
      const totalClicked = Math.max(campStats.clicked, actClicked);
      const totalReplied = Math.max(campStats.replied, actReplied);
      const totalBounced = Math.max(campStats.bounced, actBounced);
      const totalFailed = actFailed;

      const leadsCount = leadsRes.count || 0;
      const activeCampaignsCount = campaigns.filter(c => c.status === 'RUNNING').length;

      const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100) : 0;
      const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100) : 0;
      const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100) : 0;
      const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100) : 0;
      const deliveryRate = totalSent > 0 ? Math.max(0, (((totalSent - totalFailed - totalBounced) / totalSent) * 100)) : 100;

      const result = {
        leadsCount,
        campaignsCount: campaigns.length,
        activeCampaignsCount,
        totalSent,
        totalOpened,
        totalClicked,
        totalReplied,
        totalBounced,
        totalFailed,
        openRate: Number(openRate.toFixed(1)),
        replyRate: Number(replyRate.toFixed(1)),
        clickRate: Number(clickRate.toFixed(1)),
        bounceRate: Number(bounceRate.toFixed(1)),
        deliveryRate: Number(deliveryRate.toFixed(1)),
      };

      this.cache[workspaceId] = {
        data: result,
        timestamp: Date.now()
      };

      return result;
    } catch (err) {
      console.error('[AnalyticsService] Error calculating metrics:', err);
      return {
        leadsCount: 0,
        campaignsCount: 0,
        activeCampaignsCount: 0,
        totalSent: 0,
        totalOpened: 0,
        totalClicked: 0,
        totalReplied: 0,
        totalBounced: 0,
        totalFailed: 0,
        openRate: 0,
        replyRate: 0,
        clickRate: 0,
        bounceRate: 0,
        deliveryRate: 100,
      };
    }
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
