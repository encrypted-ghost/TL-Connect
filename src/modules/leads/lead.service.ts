import { supabaseAdmin } from '../../lib/supabaseAdmin';

export class LeadService {
  static async getLeads(workspaceId: string, options: any = {}) {
    const { status, search, limit = 50, offset = 0 } = options;

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

    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  static async createLead(workspaceId: string, data: any) {
    const formattedData = {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      title: data.title,
      phone: data.phone,
      linkedin_url: data.linkedinUrl,
      status: data.status || 'NEW',
      company_id: data.companyId,
      owner_id: data.ownerId,
      custom_fields: data.customFields
    };

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('id, is_deleted')
      .eq('email', data.email)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (existing) {
      if (existing.is_deleted) {
        const { data: restored, error: restError } = await supabaseAdmin
          .from('leads')
          .update({ ...formattedData, is_deleted: false })
          .eq('id', existing.id)
          .select()
          .single();
        if (restError) throw new Error(restError.message);
        return restored;
      }
      throw new Error('Lead already exists');
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
    // Basic validation and formatting
    const formattedLeads = leads.map(lead => ({
      email: lead.email,
      first_name: lead.firstName || lead.first_name,
      last_name: lead.lastName || lead.last_name,
      title: lead.title,
      phone: lead.phone,
      linkedin_url: lead.linkedinUrl || lead.linkedin_url,
      workspace_id: workspaceId,
      custom_fields: lead.customFields || lead.custom_fields || {},
      status: lead.status || 'NEW',
      is_deleted: false
    }));

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
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('workspace_id', workspace_id);

    if (error) throw new Error(error.message);
    return { success: true };
  }
}
