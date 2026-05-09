import { prisma } from '@/src/lib/prisma';
import { CampaignStatus, Prisma } from '@prisma/client';

export class CampaignService {
  static async getCampaigns(workspaceId: string) {
    return prisma.campaign.findMany({
      where: { workspaceId },
      include: {
        template: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createCampaign(data: Prisma.CampaignUncheckedCreateInput) {
    return prisma.campaign.create({
      data,
    });
  }

  static async updateStatus(id: string, status: CampaignStatus) {
    return prisma.campaign.update({
      where: { id },
      data: { status },
    });
  }

  static async getCampaignStats(id: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: {
        statsSent: true,
        statsOpened: true,
        statsClicked: true,
        statsReplied: true,
        statsBounced: true,
      },
    });

    if (!campaign) return null;

    const openRate = campaign.statsSent > 0 ? (campaign.statsOpened / campaign.statsSent) * 100 : 0;
    const replyRate = campaign.statsSent > 0 ? (campaign.statsReplied / campaign.statsSent) * 100 : 0;

    return {
      ...campaign,
      openRate: openRate.toFixed(1) + '%',
      replyRate: replyRate.toFixed(1) + '%',
    };
  }
}
