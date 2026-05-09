import { supabaseAdmin } from '../../lib/supabaseAdmin.ts';

export class TemplateService {
  static async getTemplates(workspaceId: string) {
    const { data, error } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getTemplate(id: string, workspaceId: string) {
    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !template || (template as any).workspace_id !== workspaceId) {
      throw new Error('Template not found');
    }
    return template;
  }

  static async createTemplate(workspaceId: string, data: any) {
    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .insert({
        name: data.name,
        subject: data.subject,
        body_html: data.bodyHtml || data.body_html,
        category: data.category,
        workspace_id: workspaceId,
        is_deleted: false
      })
      .select()
      .single();

    if (error) throw error;
    return template;
  }

  static async updateTemplate(id: string, workspaceId: string, data: any) {
    // Verify ownership
    await this.getTemplate(id, workspaceId);
    
    const formatted = {
      name: data.name,
      subject: data.subject,
      body_html: data.bodyHtml || data.body_html,
      category: data.category,
      updated_at: new Date().toISOString()
    };

    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .update(formatted)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return template;
  }

  static async deleteTemplate(id: string, workspaceId: string) {
    await this.getTemplate(id, workspaceId);
    
    const { data, error } = await supabaseAdmin
      .from('templates')
      .update({ is_deleted: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async seedDefaults(workspaceId: string) {
    const { count, error: countError } = await supabaseAdmin
      .from('templates')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);
    
    if (countError) throw countError;
    if (count && count > 0) return;

    const defaults = [
      {
        name: 'Welcome Email',
        subject: 'Welcome to TL Connect!',
        category: 'Onboarding',
        body_html: `<h1>Hi {{first_name}}!</h1><p>We are thrilled to have you on board. TL Connect is here to help you secure your legacy.</p><p>Best,<br>The Team</p>`,
        workspace_id: workspaceId
      },
      {
        name: 'Follow-up (Day 3)',
        subject: 'Quick question about your setup',
        category: 'Nurture',
        body_html: `<p>Hi {{first_name}},</p><p>I noticed you haven't finished setting up your vault yet. Is there anything I can help with?</p><p>Best,<br>Enterprise Team</p>`,
        workspace_id: workspaceId
      }
    ];

    const { error: insertError } = await supabaseAdmin
      .from('templates')
      .insert(defaults);

    if (insertError) throw insertError;
  }
}
