import { supabaseAdmin } from '../../lib/supabaseAdmin';

export class TemplateService {
  static async getTemplates(workspaceId: string) {
    const { data, error } = await supabaseAdmin
      .from('Template')
      .select('*')
      .eq('workspaceId', workspaceId)
      .eq('isDeleted', false)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getTemplate(id: string, workspaceId: string) {
    const { data: template, error } = await supabaseAdmin
      .from('Template')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !template || template.workspaceId !== workspaceId) {
      throw new Error('Template not found');
    }
    return template;
  }

  static async createTemplate(workspaceId: string, data: any) {
    const { data: template, error } = await supabaseAdmin
      .from('Template')
      .insert({
        ...data,
        workspaceId,
        isDeleted: false
      })
      .select()
      .single();

    if (error) throw error;
    return template;
  }

  static async updateTemplate(id: string, workspaceId: string, data: any) {
    // Verify ownership
    await this.getTemplate(id, workspaceId);
    
    const { data: template, error } = await supabaseAdmin
      .from('Template')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return template;
  }

  static async deleteTemplate(id: string, workspaceId: string) {
    await this.getTemplate(id, workspaceId);
    
    const { data, error } = await supabaseAdmin
      .from('Template')
      .update({ isDeleted: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async seedDefaults(workspaceId: string) {
    const { count, error: countError } = await supabaseAdmin
      .from('Template')
      .select('*', { count: 'exact', head: true })
      .eq('workspaceId', workspaceId);
    
    if (countError) throw countError;
    if (count && count > 0) return;

    const defaults = [
      {
        name: 'Welcome Email',
        subject: 'Welcome to TL Connect!',
        category: 'Onboarding',
        bodyHtml: `<h1>Hi {{first_name}}!</h1><p>We are thrilled to have you on board. TL Connect is here to help you secure your legacy.</p><p>Best,<br>The Team</p>`
      },
      {
        name: 'Follow-up (Day 3)',
        subject: 'Quick question about your setup',
        category: 'Nurture',
        bodyHtml: `<p>Hi {{first_name}},</p><p>I noticed you haven't finished setting up your vault yet. Is there anything I can help with?</p><p>Best,<br>Enterprise Team</p>`
      }
    ];

    const { error: insertError } = await supabaseAdmin
      .from('Template')
      .insert(defaults.map(t => ({ ...t, workspaceId })));

    if (insertError) throw insertError;
  }
}
