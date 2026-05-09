import { db } from '../../lib/supabase';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  category: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export class TemplateService {
  static async getTemplates(workspaceId: string) {
    const { data, error } = await db
      .from('Template')
      .select('*')
      .eq('workspaceId', workspaceId)
      .eq('isDeleted', false)
      .order('updatedAt', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  static async getTemplate(id: string, workspaceId: string) {
    const { data, error } = await db
      .from('Template')
      .select('*')
      .eq('id', id)
      .eq('workspaceId', workspaceId)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async createTemplate(workspaceId: string, data: Partial<EmailTemplate>) {
    const { data: template, error } = await db
      .from('Template')
      .insert([{
        ...data,
        workspaceId,
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return template;
  }

  static async updateTemplate(id: string, workspaceId: string, data: Partial<EmailTemplate>) {
    const { data: template, error } = await db
      .from('Template')
      .update({
        ...data,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .eq('workspaceId', workspaceId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return template;
  }

  static async deleteTemplate(id: string, workspaceId: string) {
    const { error } = await db
      .from('Template')
      .delete()
      .eq('id', id)
      .eq('workspaceId', workspaceId);

    if (error) throw new Error(error.message);
    return true;
  }

  /**
   * Seed some default templates if none exist
   */
  static async seedDefaults(workspaceId: string) {
    const existing = await this.getTemplates(workspaceId);
    if (existing.length > 0) return;

    const defaults = [
      {
        name: 'Welcome Email',
        subject: 'Welcome to {{brand_name}}!',
        category: 'Onboarding',
        bodyHtml: `<h1>Hi {{first_name}}!</h1><p>We are thrilled to have you on board. {{brand_name}} is here to help you secure your legacy.</p><p>Best,<br>The Team</p>`
      },
      {
        name: 'Follow-up (Day 3)',
        subject: 'Quick question about your setup',
        category: 'Nurture',
        bodyHtml: `<p>Hi {{first_name}},</p><p>I noticed you haven't finished setting up your vault yet. Is there anything I can help with?</p><p>Best,<br>{{agent_name}}</p>`
      },
      {
        name: 'Product Update',
        subject: 'New Feature: Automated Backups',
        category: 'Newsletter',
        bodyHtml: `<h1>Big News!</h1><p>We've just released automated backups for your digital assets. Log in now to enable it.</p>`
      },
      {
        name: 'Inheritance Invitation',
        subject: 'Invitation to {{policy_name}}',
        category: 'Transactional',
        bodyHtml: `<p>{{owner_name}} has invited you to join their inheritance plan <strong>"{{policy_name}}"</strong>.</p><p><a href="{{invite_url}}">Accept Invitation</a></p>`
      },
      {
        name: 'Account Verification',
        subject: 'Verify your email address',
        category: 'Transactional',
        bodyHtml: `<p>Please verify your email address by clicking the link below:</p><p><a href="{{verify_url}}">Verify Now</a></p>`
      },
      {
        name: 'Webinar Invite',
        subject: 'Live Workshop: Securing your crypto assets',
        category: 'Marketing',
        bodyHtml: `<p>Join us this Friday for a deep dive into secure digital custody.</p><p><a href="{{register_url}}">Register Here</a></p>`
      },
      {
        name: 'Feedback Request',
        subject: 'How are we doing?',
        category: 'Nurture',
        bodyHtml: `<p>Hi {{first_name}}, we'd love to hear your thoughts on your experience so far.</p>`
      },
      {
        name: 'Payment Failure',
        subject: 'Action Required: Payment Failed',
        category: 'System',
        bodyHtml: `<p>Your recent payment was declined. Please update your billing info to keep your account active.</p>`
      },
      {
        name: 'Security Alert',
        subject: 'New login detected',
        category: 'Security',
        bodyHtml: `<p>We detected a new login to your account from a new device. If this wasn't you, please reset your password immediately.</p>`
      },
      {
        name: 'Legacy Review',
        subject: 'Time for your annual legacy review',
        category: 'Nurture',
        bodyHtml: `<p>It's been a year since your last update. We recommend reviewing your beneficiaries to ensure everything is current.</p>`
      }
    ];

    for (const t of defaults) {
      await this.createTemplate(workspaceId, t);
    }
  }
}
