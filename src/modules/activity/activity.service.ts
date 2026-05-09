import { supabaseAdmin } from '@/src/lib/supabaseAdmin';

export class ActivityService {
  static async log(data: {
    type: string;
    description?: string;
    metadata?: any;
    userId?: string;
    leadId?: string;
    workspaceId: string;
  }) {
    const { data: activity, error } = await supabaseAdmin
      .from('Activity')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return activity;
  }

  static async getWorkspaceActivity(workspaceId: string, limit = 10) {
    const { data, error } = await supabaseAdmin
      .from('Activity')
      .select('*, User(name, avatarUrl), Lead(firstName, lastName)')
      .eq('workspaceId', workspaceId)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
}
