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

  static async getWorkspaceActivity(workspaceId: string, limit = 20) {
    try {
      const { data, error } = await supabaseAdmin
        .from('activities')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching activity:', err);
      return [];
    }
  }

  static async getEmailLogs(workspaceId: string, limit = 100) {
    try {
      const { data, error } = await supabaseAdmin
        .from('activities')
        .select(`
          *,
          lead:leads(first_name, last_name, email, company_name, category)
        `)
        .eq('workspace_id', workspaceId)
        .in('type', [
          'EMAIL_SENT', 
          'EMAIL_OPENED', 
          'EMAIL_CLICKED', 
          'EMAIL_BOUNCED', 
          'EMAIL_FAILED', 
          'EMAIL_SUPPRESSED', 
          'EMAIL_SPAM', 
          'EMAIL_BLOCKED',
          'EMAIL_UNSUBSCRIBED',
          'REPLY'
        ])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching email logs:', err);
      return [];
    }
  }
}
