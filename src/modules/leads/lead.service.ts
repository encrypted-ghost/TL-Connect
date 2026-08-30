import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { EmailProviderFactory } from '../email/email.factory';

export class LeadService {
  static async getLeads(workspaceId: string, options: any = {}) {
    const { status, category, search, limit = 100, offset = 0 } = options;

    let query = supabaseAdmin
      .from('leads')
      .select(`
        *,
        company:companies(name, industry),
        owner:users(name, avatar_url),
        tags:lead_tags(tag:tags(*))
      `)
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .range(offset, offset + limit - 1);

    if (status && status !== 'ALL') query = query.eq('status', status);
    if (category && category !== 'ALL') query = query.eq('category', category);
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company_name.ilike.%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  static async createLead(workspaceId: string, data: any) {
    const rawCompanyName = (data.companyName || data.company_name || data.company || '').trim();
    let companyId = data.companyId || data.company_id || null;

    // Auto-create or resolve company in companies table
    if (rawCompanyName && !companyId) {
      try {
        const { data: existingCompany } = await supabaseAdmin
          .from('companies')
          .select('id')
          .eq('workspace_id', workspaceId)
          .ilike('name', rawCompanyName)
          .maybeSingle();

        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const { data: newCompany } = await supabaseAdmin
            .from('companies')
            .insert([{
              name: rawCompanyName,
              workspace_id: workspaceId
            }])
            .select('id')
            .single();

          if (newCompany) {
            companyId = newCompany.id;
          }
        }
      } catch (err) {
        console.warn('[LeadService] Company lookup/creation warning:', err);
      }
    }

    const formattedData: any = {
      email: data.email?.toLowerCase()?.trim(),
      first_name: data.firstName || data.first_name || '',
      last_name: data.lastName || data.last_name || '',
      title: data.title || '',
      phone: data.phone || '',
      linkedin_url: data.linkedinUrl || data.linkedin_url || '',
      company_name: rawCompanyName || null,
      company_id: companyId,
      category: data.category || 'Outbound',
      status: data.status || 'NEW',
      owner_id: data.ownerId || data.owner_id || null,
      custom_fields: data.customFields || data.custom_fields || {}
    };

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('id, is_deleted')
      .eq('email', formattedData.email)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (existing) {
      if (existing.is_deleted) {
        const { data: restored, error: restError } = await supabaseAdmin
          .from('leads')
          .update({ ...formattedData, is_deleted: false, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        if (restError) throw new Error(restError.message);
        return restored;
      }
      throw new Error('Lead with this email already exists in this workspace');
    }

    const { data: newLead, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert([{ ...formattedData, workspace_id: workspaceId }])
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);
    return newLead;
  }

  static async bulkCreateLeads(workspaceId: string, leads: any[]) {
    const formattedLeads = leads.map(lead => {
      const companyName = (lead.companyName || lead.company_name || lead.company || '').trim();
      return {
        email: (lead.email || '').toLowerCase().trim(),
        first_name: lead.firstName || lead.first_name || '',
        last_name: lead.lastName || lead.last_name || '',
        title: lead.title || '',
        phone: lead.phone || '',
        linkedin_url: lead.linkedinUrl || lead.linkedin_url || '',
        company_name: companyName || null,
        category: lead.category || 'Outbound',
        workspace_id: workspaceId,
        custom_fields: lead.customFields || lead.custom_fields || {},
        status: lead.status || 'NEW',
        is_deleted: false
      };
    }).filter(l => l.email);

    const { data, error } = await supabaseAdmin
      .from('leads')
      .upsert(formattedLeads, { 
        onConflict: 'email,workspace_id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) throw new Error(error.message);
    return data;
  }

  static async deleteLead(id: string, workspace_id: string) {
    const { error } = await supabaseAdmin
      .from('leads')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspace_id);

    if (error) throw new Error(error.message);
    return { success: true };
  }

  /**
   * Send a direct, one-off email to a specific lead
   */
  static async sendDirectEmail(leadId: string, workspaceId: string, options: { subject: string; html: string; fromName?: string; fromEmail?: string; providerId?: string }) {
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('workspace_id', workspaceId)
      .single();

    if (leadErr || !lead) throw new Error('Lead not found');

    const emailConfig = await EmailProviderFactory.getProviderForWorkspace(workspaceId);
    const provider = emailConfig.provider;
    const effectiveFromEmail = options.fromEmail || emailConfig.fromEmail || 'outreach@transferlegacy.com';
    const effectiveFromName = options.fromName || emailConfig.fromName || 'TL Connect';

    // Interpolate variables
    let finalHtml = options.html;
    finalHtml = finalHtml.replace(/\{\{first_name\}\}/gi, lead.first_name || 'there');
    finalHtml = finalHtml.replace(/\{\{last_name\}\}/gi, lead.last_name || '');
    finalHtml = finalHtml.replace(/\{\{company\}\}/gi, lead.company_name || 'your company');
    finalHtml = finalHtml.replace(/\{\{email\}\}/gi, lead.email);

    const sendResult = await provider.send({
      toEmail: lead.email,
      fromEmail: effectiveFromEmail,
      fromName: effectiveFromName,
      subject: options.subject,
      html: finalHtml,
      text: finalHtml.replace(/<[^>]*>?/gm, ''),
      metadata: {
        leadId: lead.id,
        workspaceId,
        directSend: true,
        provider: emailConfig.providerType
      }
    });

    if (!sendResult.success) {
      // Log failed activity
      await supabaseAdmin.from('activities').insert({
        type: 'EMAIL_FAILED',
        description: `Direct email to ${lead.email} failed: ${sendResult.error || 'Unknown error'}`,
        metadata: { leadId: lead.id, error: sendResult.error, provider: emailConfig.providerType, subject: options.subject },
        lead_id: lead.id,
        workspace_id: workspaceId
      });
      throw new Error(sendResult.error || 'Failed to dispatch email');
    }

    // Log success activity
    await supabaseAdmin.from('activities').insert({
      type: 'EMAIL_SENT',
      description: `Direct email sent to ${lead.email} via ${emailConfig.providerType}`,
      metadata: { 
        leadId: lead.id, 
        provider: emailConfig.providerType, 
        messageId: sendResult.messageId, 
        subject: options.subject,
        direct: true
      },
      lead_id: lead.id,
      workspace_id: workspaceId
    });

    // Update lead status
    await supabaseAdmin
      .from('leads')
      .update({ status: 'CONTACTED', updated_at: new Date().toISOString() })
      .eq('id', lead.id);

    return { success: true, messageId: sendResult.messageId, provider: emailConfig.providerType };
  }
}
