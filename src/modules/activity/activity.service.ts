import { supabaseAdmin } from '../../lib/supabaseAdmin';

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
      .from('activities')
      .insert({
        type: data.type,
        description: data.description,
        metadata: data.metadata,
        user_id: data.userId,
        lead_id: data.leadId,
        workspace_id: data.workspaceId,
      })
      .select()
      .single();

    if (error) throw error;
    return activity;
  }

  static async getWorkspaceActivity(workspaceId: string, limit = 10) {
    try {
      const { data, error } = await supabaseAdmin
        .from('activities')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching activity:', err);
      // Fallback: return empty array instead of throwing to prevent UI crash if possible
      // but the service should probably throw and the route should handle it.
      // Keeping throw for now but with a clearer log.
      throw err;
    }
  }
}
