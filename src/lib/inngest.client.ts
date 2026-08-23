import { Inngest } from 'inngest';

export type InngestEvents = {
  'outreach/campaign.started': {
    data: {
      campaignId: string;
      workspaceId: string;
    };
  };
  'outreach/email.dispatch': {
    data: {
      campaignId?: string;
      leadId: string;
      workspaceId: string;
      templateId?: string;
      subject?: string;
      html?: string;
      toEmail: string;
      fromEmail?: string;
      fromName?: string;
    };
  };
};

export const inngest = new Inngest({
  id: 'tl-connect',
  name: 'TL Connect Outreach Engine',
});
