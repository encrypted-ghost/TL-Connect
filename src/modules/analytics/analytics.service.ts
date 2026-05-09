import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export class AnalyticsService {
  static async getWorkspaceMetrics(workspaceId: string) {
    // Lead Count
    const leadsQ = query(
      collection(db, 'leads'),
      where('workspaceId', '==', workspaceId)
    );
    const leadsSnap = await getDocs(leadsQ);
    const leadsCount = leadsSnap.size;

    // Campaign Stats
    const campaignsQ = query(
      collection(db, 'campaigns'),
      where('workspaceId', '==', workspaceId)
    );
    const campaignsSnap = await getDocs(campaignsQ);
    const campaignData = campaignsSnap.docs.map(d => d.data());

    const totalSent = campaignData.reduce((acc, c) => acc + (c.statsSent || 0), 0);
    const totalReplies = campaignData.reduce((acc, c) => acc + (c.statsReplied || 0), 0);
    const totalBounces = campaignData.reduce((acc, c) => acc + (c.statsBounced || 0), 0);

    return {
      leadsCount: leadsCount || 0,
      campaignsCount: campaignData.length || 0,
      totalSent,
      replyRate: totalSent > 0 ? (totalReplies / totalSent) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounces / totalSent) * 100 : 0,
    };
  }

  static async getCampaignPerformance(campaignId: string) {
    const docRef = doc(db, 'campaigns', campaignId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    const stats = docSnap.data();

    const calculateRate = (dividend: number) => 
      stats.statsSent > 0 ? ((dividend / stats.statsSent) * 100).toFixed(1) + '%' : '0%';

    return {
      id: docSnap.id,
      ...stats,
      openRate: calculateRate(stats.statsOpened || 0),
      clickRate: calculateRate(stats.statsClicked || 0),
      replyRate: calculateRate(stats.statsReplied || 0),
      bounceRate: calculateRate(stats.statsBounced || 0),
    };
  }
}
