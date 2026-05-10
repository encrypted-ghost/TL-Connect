import { supabaseAdmin } from '../../lib/supabaseAdmin.ts';

/**
 * Workspace Management Service (Supabase Native)
 */
export class WorkspaceService {
  /**
   * Create a new workspace via Supabase REST API
   */
  static async createWorkspace(name: string) {
    const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
    
    // Create workspace
    const { data: workspace, error } = await supabaseAdmin
      .from('workspaces')
      .insert([{ name, slug }])
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Create default settings
    await supabaseAdmin.from('workspace_settings').insert([{
      workspace_id: workspace.id,
      email_daily_limit: 1000,
      timezone: 'UTC'
    }]);

    return workspace;
  }

  /**
   * Get workspace with stats
   */
  static async getWorkspace(id: string) {
    const { data: workspace, error } = await supabaseAdmin
      .from('workspaces')
      .select(`
        *,
        settings:workspace_settings(*),
        leads:leads(count),
        campaigns:campaigns(count),
        users:users(count)
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return workspace;
  }

  /**
   * Update workspace settings
   */
  static async updateSettings(workspaceId: string, data: any) {
    const { data: settings, error } = await supabaseAdmin
      .from('workspace_settings')
      .update({
        email_daily_limit: data.emailDailyLimit || data.email_daily_limit,
        timezone: data.timezone,
        slack_webhook_url: data.slackWebhookUrl || data.slack_webhook_url,
        updated_at: new Date().toISOString()
      })
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return settings;
  }
}
