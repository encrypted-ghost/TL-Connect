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
      .from('Workspace')
      .insert([{ name, slug }])
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Create default settings
    await supabaseAdmin.from('WorkspaceSettings').insert([{
      workspaceId: workspace.id,
      emailDailyLimit: 1000,
      timezone: 'UTC'
    }]);

    return workspace;
  }

  /**
   * Get workspace with stats
   */
  static async getWorkspace(id: string) {
    const { data: workspace, error } = await supabaseAdmin
      .from('Workspace')
      .select(`
        *,
        settings:WorkspaceSettings(*),
        leads:Lead(count),
        campaigns:Campaign(count),
        users:User(count)
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
      .from('WorkspaceSettings')
      .update(data)
      .eq('workspaceId', workspaceId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return settings;
  }
}
