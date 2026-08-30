import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { QueueService } from '../queue/queue.service';
import { TemplateService } from '../templates/template.service';
import { EmailProviderFactory } from '../email/email.factory';

export class CampaignService {
  static async getCampaigns(workspaceId: string) {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*, template:templates(id, name, subject)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async createCampaign(workspaceId: string, data: any) {
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .insert({
        name: data.name,
        template_id: data.templateId || data.template_id,
        workspace_id: workspaceId,
        target_category: data.targetCategory || data.target_category || null,
        target_status: data.targetStatus || data.target_status || null,
        provider_id: data.providerId || data.provider_id || null,
        status: 'DRAFT'
      })
      .select('*, template:templates(id, name, subject)')
      .single();

    if (error) throw error;
    return campaign;
  }

  static async updateCampaign(campaignId: string, workspaceId: string, data: any) {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.templateId !== undefined || data.template_id !== undefined) {
      updateData.template_id = data.templateId ?? data.template_id;
    }
    if (data.targetCategory !== undefined || data.target_category !== undefined) {
      updateData.target_category = data.targetCategory ?? data.target_category;
    }
    if (data.targetStatus !== undefined || data.target_status !== undefined) {
      updateData.target_status = data.targetStatus ?? data.target_status;
    }
    if (data.providerId !== undefined || data.provider_id !== undefined) {
      updateData.provider_id = data.providerId ?? data.provider_id;
    }
    if (data.status !== undefined) updateData.status = data.status;

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .eq('workspace_id', workspaceId)
      .select('*, template:templates(id, name, subject)')
      .single();

    if (error) throw error;
    return campaign;
  }

  static async startCampaign(campaignId: string, workspaceId: string) {
    // 1. Get Campaign and Template details
    const { data: campaign, error: cError } = await supabaseAdmin
      .from('campaigns')
      .select('*, template:templates(*)')
      .eq('id', campaignId)
      .eq('workspace_id', workspaceId)
      .single();

    if (cError || !campaign) throw new Error('Campaign not found');
    if (!campaign.template) throw new Error('Campaign has no email template selected');

    // 2. Fetch targeted leads for this workspace
    let query = supabaseAdmin
      .from('leads')
      .select('id, email, first_name, last_name, company_name, category, status')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    // Apply audience filters
    if (campaign.target_category && campaign.target_category !== 'ALL') {
      query = query.eq('category', campaign.target_category);
    }
    if (campaign.target_status && campaign.target_status !== 'ALL') {
      query = query.eq('status', campaign.target_status);
    }

    let leads: any[] = [];
    const { data: primaryLeads, error: lError } = await query;

    if (lError || !primaryLeads) {
      console.warn('[CampaignService] Targeted query fallback:', lError?.message);
      const fallbackRes = await supabaseAdmin
        .from('leads')
        .select('id, email, first_name, last_name, status')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false);
      leads = fallbackRes.data || [];
    } else {
      leads = primaryLeads;
    }

    if (!leads || leads.length === 0) {
      throw new Error(`No leads matched the audience filter (${campaign.target_category || 'All Categories'}, ${campaign.target_status || 'All Statuses'}).`);
    }

    // 3. Fetch unsubscribed emails for suppression
    const { data: unsubscribed } = await supabaseAdmin
      .from('unsubscribes')
      .select('email')
      .eq('workspace_id', workspaceId);

    const unsubscribedEmails = new Set((unsubscribed || []).map(u => u.email.toLowerCase().trim()));

    // 4. Mark Campaign as RUNNING
    await supabaseAdmin
      .from('campaigns')
      .update({ 
        status: 'RUNNING',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    // 5. Load Active Email Provider
    const emailConfig = await EmailProviderFactory.getProviderForWorkspace(workspaceId, campaign.provider_id);
    const provider = emailConfig.provider;
    const template = campaign.template as any;
    const appUrl = process.env.APP_URL || 'https://connect.transferlegacy.com';
    const fromEmail = emailConfig.fromEmail || process.env.SENDER_EMAIL || 'outreach@transferlegacy.com';
    const fromName = emailConfig.fromName || process.env.SENDER_NAME || 'Transfer Legacy';

    let sentCount = 0;
    let failedCount = 0;

    // 6. Direct Immediate Dispatch Loop
    for (const lead of leads) {
      if (unsubscribedEmails.has(lead.email.toLowerCase().trim())) {
        // Record suppression
        try {
          await supabaseAdmin.from('activities').insert({
            type: 'EMAIL_SUPPRESSED',
            description: `Campaign email to ${lead.email} suppressed (unsubscribed)`,
            metadata: { 
              campaignId: campaign.id, 
              campaignName: campaign.name,
              leadId: lead.id, 
              toEmail: lead.email,
              provider: emailConfig.providerType,
              reason: 'unsubscribed' 
            },
            lead_id: lead.id,
            workspace_id: workspaceId
          });
        } catch {}
        continue;
      }

      // Interpolate template variables
      let html = template.body_html || '';
      const leadCompany = lead.company_name || 'your company';
      html = html.replace(/\{\{first_name\}\}/gi, lead.first_name || 'there');
      html = html.replace(/\{\{last_name\}\}/gi, lead.last_name || '');
      html = html.replace(/\{\{company\}\}/gi, leadCompany);
      html = html.replace(/\{\{email\}\}/gi, lead.email);

      // Append unsubscribe footer
      const unsubscribeLink = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(lead.email)}&workspaceId=${workspaceId}`;
      const unsubscribeFooter = `
        <br/><br/>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280; font-family: sans-serif; line-height: 1.5;">
          You are receiving this outreach email from ${fromName}.<br/>
          To stop receiving emails, you can <a href="${unsubscribeLink}" style="color: #4f46e5; text-decoration: underline;" target="_blank">unsubscribe here</a>.
        </p>
      `;
      html += unsubscribeFooter;

      const recipientName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.email;
      const subject = template.subject || campaign.name || 'Outreach';

      try {
        const sendResult = await provider.send({
          toEmail: lead.email,
          fromEmail,
          fromName,
          subject,
          html,
          text: html.replace(/<[^>]*>?/gm, ''),
          metadata: {
            campaignId: campaign.id,
            leadId: lead.id,
            workspaceId,
            providerType: emailConfig.providerType
          }
        });

        if (sendResult.success) {
          sentCount++;
          // Log success activity
          await supabaseAdmin.from('activities').insert({
            type: 'EMAIL_SENT',
            description: `Campaign "${campaign.name}" email sent to ${lead.email} via ${emailConfig.providerType}`,
            metadata: { 
              campaignId: campaign.id,
              campaignName: campaign.name,
              leadId: lead.id, 
              toEmail: lead.email,
              recipientName,
              company: leadCompany,
              provider: emailConfig.providerType,
              messageId: sendResult.messageId,
              subject
            },
            lead_id: lead.id,
            workspace_id: workspaceId
          });

          // Mark lead contacted
          await supabaseAdmin
            .from('leads')
            .update({ status: 'CONTACTED', updated_at: new Date().toISOString() })
            .eq('id', lead.id);
        } else {
          failedCount++;
          await supabaseAdmin.from('activities').insert({
            type: 'EMAIL_FAILED',
            description: `Campaign email to ${lead.email} failed: ${sendResult.error || 'Unknown error'}`,
            metadata: { 
              campaignId: campaign.id, 
              campaignName: campaign.name,
              leadId: lead.id, 
              toEmail: lead.email,
              recipientName,
              company: leadCompany,
              error: sendResult.error, 
              provider: emailConfig.providerType, 
              subject 
            },
            lead_id: lead.id,
            workspace_id: workspaceId
          });
        }
      } catch (sendErr: any) {
        failedCount++;
        console.error(`[CampaignService] Error dispatching to ${lead.email}:`, sendErr);
        try {
          await supabaseAdmin.from('activities').insert({
            type: 'EMAIL_FAILED',
            description: `Campaign email to ${lead.email} error: ${sendErr.message}`,
            metadata: { 
              campaignId: campaign.id, 
              campaignName: campaign.name,
              leadId: lead.id, 
              toEmail: lead.email,
              recipientName,
              error: sendErr.message, 
              provider: emailConfig.providerType, 
              subject 
            },
            lead_id: lead.id,
            workspace_id: workspaceId
          });
        } catch {}
      }
    }

    // 7. Update Campaign Status & Statistics
    const currentSent = (campaign.stats_sent || 0) + sentCount;
    const finalStatus = sentCount > 0 ? 'COMPLETED' : (failedCount > 0 ? 'FAILED' : 'COMPLETED');

    const { data: updatedCampaign } = await supabaseAdmin
      .from('campaigns')
      .update({ 
        status: finalStatus,
        stats_sent: currentSent,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select('*, template:templates(id, name, subject)')
      .single();

    return { 
      ...(updatedCampaign || campaign), 
      sentCount, 
      failedCount, 
      totalTargeted: leads.length,
      provider: emailConfig.providerType 
    };
  }

  static async stopCampaign(campaignId: string, workspaceId: string) {
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .update({ 
        status: 'PAUSED',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('workspace_id', workspaceId)
      .select('*, template:templates(id, name, subject)')
      .single();

    if (error) throw error;
    return campaign;
  }

  static async deleteCampaign(id: string, workspaceId: string) {
    const { error } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return { success: true };
  }
}
