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
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('[LeadService] getLeads error:', error);
      throw new Error(error.message);
    }
    
    // Normalize company name across company relation and company_name field
    return (data || []).map(lead => ({
      ...lead,
      company_name: lead.company_name || lead.company?.name || null
    }));
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
      company_id: companyId,
      company_name: rawCompanyName || null,
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
        try {
          const { data: restored, error: restError } = await supabaseAdmin
            .from('leads')
            .update({ ...formattedData, is_deleted: false, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();
          if (restError) throw restError;
          return restored;
        } catch (updateErr: any) {
          // Fallback if company_name column is missing
          delete formattedData.company_name;
          const { data: restored, error: retryError } = await supabaseAdmin
            .from('leads')
            .update({ ...formattedData, is_deleted: false, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();
          if (retryError) throw new Error(retryError.message);
          return restored;
        }
      }
      throw new Error('Lead with this email already exists in this workspace');
    }

    try {
      const { data: newLead, error: insertError } = await supabaseAdmin
        .from('leads')
        .insert([{ ...formattedData, workspace_id: workspaceId }])
        .select()
        .single();

      if (insertError) throw insertError;
      return newLead;
    } catch (insertErr: any) {
      // Safe fallback if company_name column is not in DB yet
      if (insertErr.message?.includes('company_name')) {
        delete formattedData.company_name;
        const { data: retryLead, error: retryErr } = await supabaseAdmin
          .from('leads')
          .insert([{ ...formattedData, workspace_id: workspaceId }])
          .select()
          .single();
        if (retryErr) throw new Error(retryErr.message);
        return retryLead;
      }
      throw new Error(insertErr.message);
    }
  }

  static async updateLead(id: string, workspaceId: string, data: any) {
    const rawCompanyName = (data.companyName || data.company_name || data.company || '').trim();
    let companyId = data.companyId || data.company_id || null;

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
        console.warn('[LeadService] Company lookup/creation warning on update:', err);
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
    if (data.firstName !== undefined || data.first_name !== undefined) updateData.first_name = data.firstName ?? data.first_name;
    if (data.lastName !== undefined || data.last_name !== undefined) updateData.last_name = data.lastName ?? data.last_name;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.linkedinUrl !== undefined || data.linkedin_url !== undefined) updateData.linkedin_url = data.linkedinUrl ?? data.linkedin_url;
    if (companyId !== null) updateData.company_id = companyId;
    if (rawCompanyName) updateData.company_name = rawCompanyName;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.customFields !== undefined || data.custom_fields !== undefined) updateData.custom_fields = data.customFields ?? data.custom_fields;

    try {
      const { data: updatedLead, error } = await supabaseAdmin
        .from('leads')
        .update(updateData)
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .select()
        .single();

      if (error) throw error;
      return updatedLead;
    } catch (err: any) {
      if (err.message?.includes('company_name')) {
        delete updateData.company_name;
        const { data: retryLead, error: retryErr } = await supabaseAdmin
          .from('leads')
          .update(updateData)
          .eq('id', id)
          .eq('workspace_id', workspaceId)
          .select()
          .single();
        if (retryErr) throw new Error(retryErr.message);
        return retryLead;
      }
      throw new Error(err.message);
    }
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

    try {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .upsert(formattedLeads, { 
          onConflict: 'email,workspace_id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) throw error;
      return data;
    } catch (err: any) {
      if (err.message?.includes('company_name')) {
        const cleaned = formattedLeads.map(l => {
          const { company_name, ...rest } = l;
          return rest;
        });
        const { data: retryData, error: retryErr } = await supabaseAdmin
          .from('leads')
          .upsert(cleaned, { 
            onConflict: 'email,workspace_id',
            ignoreDuplicates: false 
          })
          .select();
        if (retryErr) throw new Error(retryErr.message);
        return retryData;
      }
      throw new Error(err.message);
    }
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
      .select('*, company:companies(name)')
      .eq('id', leadId)
      .eq('workspace_id', workspaceId)
      .single();

    if (leadErr || !lead) throw new Error('Lead not found');

    const emailConfig = await EmailProviderFactory.getProviderForWorkspace(workspaceId);
    const provider = emailConfig.provider;
    const effectiveFromEmail = options.fromEmail || emailConfig.fromEmail || 'outreach@transferlegacy.com';
    const effectiveFromName = options.fromName || emailConfig.fromName || 'TL Connect';
    const leadCompany = lead.company_name || lead.company?.name || 'your company';

    // Interpolate variables
    let finalHtml = options.html;
    finalHtml = finalHtml.replace(/\{\{first_name\}\}/gi, lead.first_name || 'there');
    finalHtml = finalHtml.replace(/\{\{last_name\}\}/gi, lead.last_name || '');
    finalHtml = finalHtml.replace(/\{\{company\}\}/gi, leadCompany);
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

    const recipientName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.email;

    if (!sendResult.success) {
      try {
        await supabaseAdmin.from('activities').insert({
          type: 'EMAIL_FAILED',
          description: `Direct email to ${lead.email} failed: ${sendResult.error || 'Unknown error'}`,
          metadata: { 
            leadId: lead.id, 
            toEmail: lead.email,
            recipientName,
            company: leadCompany,
            error: sendResult.error, 
            provider: emailConfig.providerType, 
            subject: options.subject,
            direct: true
          },
          lead_id: lead.id,
          workspace_id: workspaceId
        });
      } catch (logErr) {
        console.error('[LeadService] Failed to record failure activity log:', logErr);
      }
      throw new Error(sendResult.error || 'Failed to dispatch email');
    }

    try {
      await supabaseAdmin.from('activities').insert({
        type: 'EMAIL_SENT',
        description: `Direct email sent to ${lead.email} via ${emailConfig.providerType}`,
        metadata: { 
          leadId: lead.id, 
          toEmail: lead.email,
          recipientName,
          company: leadCompany,
          provider: emailConfig.providerType, 
          messageId: sendResult.messageId, 
          subject: options.subject,
          direct: true
        },
        lead_id: lead.id,
        workspace_id: workspaceId
      });
    } catch (logErr) {
      console.error('[LeadService] Failed to record success activity log:', logErr);
    }

    try {
      await supabaseAdmin
        .from('leads')
        .update({ status: 'CONTACTED', updated_at: new Date().toISOString() })
        .eq('id', lead.id);
    } catch (leadUpdateErr) {
      console.warn('[LeadService] Status update warning on lead:', leadUpdateErr);
    }

    return { success: true, messageId: sendResult.messageId, provider: emailConfig.providerType };
  }
}
