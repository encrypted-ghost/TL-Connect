import { prisma } from '@/src/lib/prisma';
import { ActivityType, Prisma } from '@prisma/client';

export class ActivityService {
  static async log(data: {
    type: ActivityType;
    description?: string;
    metadata?: Prisma.JsonValue;
    userId?: string;
    leadId?: string;
    workspaceId: string;
  }) {
    return prisma.activity.create({
      data,
    });
  }

  static async getWorkspaceActivity(workspaceId: string, limit = 10) {
    return prisma.activity.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, avatarUrl: true } },
        lead: { select: { firstName: true, lastName: true } },
      }
    });
  }
}
