import { inngest } from '../../lib/inngest.client';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export const runCampaignWorkflow = (inngest as any).createFunction(
  {
    id: 'run-outreach-campaign',
    name: 'Run Outreach Campaign Fanout',
  },
  { event: 'outreach/campaign.started' },
  async ({ event, step }) => {
    const { campaignId, workspaceId } = event.data;

    // Step 1: Fetch campaign & template details
    const campaignData = await step.run('fetch-campaign-and-leads', async () => {
      const { data: campaign, error: campErr } = await supabaseAdmin
        .from('campaigns')
        .select('*, templates(*)')
        .eq('id', campaignId)
        .eq('workspace_id', workspaceId)
        .single();

      if (campErr || !campaign) {
        throw new Error('Campaign not found');
      }

      // Fetch all non-deleted leads
      const { data: leads, error: leadsErr } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false);

      if (leadsErr) throw leadsErr;

      return {
        campaign,
        template: campaign.templates,
        leads: leads || [],
      };
    });

    const { campaign, template, leads } = campaignData;
    if (!leads.length || !template) {
      return { status: 'completed', dispatched: 0 };
    }

    // Step 2: Prepare event batch with anti-spam staggering
    const eventsToDispatch = leads.map((lead: any) => {
      let personalizedHtml = template.body_html || '';
      personalizedHtml = personalizedHtml
        .replace(/{{first_name}}/gi, lead.first_name || lead.firstName || 'there')
        .replace(/{{last_name}}/gi, lead.last_name || lead.lastName || '')
        .replace(/{{email}}/gi, lead.email || '')
        .replace(/{{company}}/gi, lead.company_name || lead.companyName || 'your company')
        .replace(/{{title}}/gi, lead.title || 'Leader')
        .replace(
          /{{unsubscribe_link}}/gi,
          `${process.env.APP_URL || 'https://connect.transferlegacy.com'}/api/unsubscribe?email=${encodeURIComponent(lead.email)}&workspaceId=${workspaceId}`
        );

      let personalizedSubject = template.subject || 'Outreach';
      personalizedSubject = personalizedSubject
        .replace(/{{first_name}}/gi, lead.first_name || lead.firstName || 'there')
        .replace(/{{company}}/gi, lead.company_name || lead.companyName || 'your company');

      return {
        name: 'outreach/email.dispatch' as const,
        data: {
          campaignId: campaign.id,
          leadId: lead.id,
          workspaceId,
          toEmail: lead.email,
          subject: personalizedSubject,
          html: personalizedHtml,
        },
      };
    });

    // Step 3: Publish batch to Inngest
    await step.sendEvent('fan-out-lead-emails', eventsToDispatch);

    return {
      status: 'dispatched',
      totalLeads: leads.length,
      campaignId,
    };
  }
);
