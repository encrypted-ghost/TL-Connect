import { prisma } from '@/src/lib/prisma';
import { emailProvider } from '../email/email.provider';
import { JobStatus } from '@prisma/client';

export class CampaignEngine {
  static async processQueue() {
    const jobs = await prisma.queueJob.findMany({
      where: {
        status: JobStatus.PENDING,
        runAt: { lte: new Date() },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: 10,
    });

    for (const job of jobs) {
      await this.processJob(job.id);
    }
  }

  private static async processJob(jobId: string) {
    const job = await prisma.queueJob.findUnique({ where: { id: jobId } });
    if (!job) return;

    await prisma.queueJob.update({
      where: { id: jobId },
      data: { status: JobStatus.PROCESSING },
    });

    try {
      if (job.type === 'SEND_EMAIL') {
        const payload = job.payload as any;
        await emailProvider.send({
          from: payload.from,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          tags: [payload.campaignId],
          metadata: { jobId: job.id, leadId: payload.leadId },
        });

        // Update campaign stats
        await prisma.campaign.update({
          where: { id: payload.campaignId },
          data: { statsSent: { increment: 1 } },
        });

        // Record activity
        await prisma.activity.create({
          data: {
            type: 'EMAIL_SENT',
            description: `Sent email to ${payload.to}`,
            leadId: payload.leadId,
            workspaceId: payload.workspaceId,
          }
        });
      }

      await prisma.queueJob.update({
        where: { id: jobId },
        data: { status: JobStatus.COMPLETED },
      });
    } catch (error) {
      console.error('Job processing failed:', error);
      const retryCount = job.retryCount + 1;
      
      await prisma.queueJob.update({
        where: { id: jobId },
        data: {
          status: retryCount >= job.maxRetries ? JobStatus.FAILED : JobStatus.PENDING,
          retryCount,
          lastError: error instanceof Error ? error.message : String(error),
          runAt: new Date(Date.now() + Math.pow(2, retryCount) * 1000), // Exponential backoff
        },
      });
    }
  }
}
