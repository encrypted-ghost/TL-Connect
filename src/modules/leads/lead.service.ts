import { supabaseAdmin } from '../../lib/supabaseAdmin.ts';

export class LeadService {
  static async getLeads(workspaceId: string, options: any = {}) {
    const { status, search, limit = 50, offset = 0 } = options;

    let query = supabaseAdmin
      .from('Lead')
      .select(`
        *,
        company:Company(name, industry),
        owner:User(name, avatarUrl),
        tags:Tag(*)
      `)
      .eq('workspaceId', workspaceId)
      .eq('isDeleted', false)
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(`email.ilike.%${search}%,firstName.ilike.%${search}%,lastName.ilike.%${search}%`);
    }

    const { data, error } = await query.order('createdAt', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  static async createLead(workspaceId: string, data: any) {
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('Lead')
      .select('id, isDeleted')
      .eq('email', data.email)
      .eq('workspaceId', workspaceId)
      .maybeSingle();

    if (existing) {
      if (existing.isDeleted) {
        const { data: restored, error: restError } = await supabaseAdmin
          .from('Lead')
          .update({ ...data, isDeleted: false })
          .eq('id', existing.id)
          .select()
          .single();
        if (restError) throw new Error(restError.message);
        return restored;
      }
      throw new Error('Lead already exists');
    }

    const { data: newLead, error: insertError } = await supabaseAdmin
      .from('Lead')
      .insert([{ ...data, workspaceId }])
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);
    return newLead;
  }
}
