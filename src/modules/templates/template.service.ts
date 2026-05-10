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

    const createTemplateBody = (title: string, badge: string, content: string, ctaText: string, ctaUrl: string) => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TL Connect - ${title}</title>
    <style>
      body { margin: 0; padding: 0; background: #f5f5f0; font-family: "Georgia", "Times New Roman", serif; color: #1f1d1b; }
      .wrapper { max-width: 640px; margin: 0 auto; padding: 32px 20px 48px; }
      .card { background: #ffffff; border: 1px solid #e0ddd7; border-radius: 12px; padding: 28px; box-shadow: 0 8px 24px rgba(22, 18, 14, 0.08); }
      .badge { display: inline-block; background: #1f1d1b; color: #f5f5f0; padding: 6px 12px; border-radius: 999px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
      h1 { margin: 16px 0 12px; font-size: 28px; line-height: 1.2; }
      p { margin: 0 0 12px; font-size: 16px; line-height: 1.6; }
      .cta { display: inline-block; margin: 18px 0 8px; padding: 12px 18px; background: #1f1d1b; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; }
      .meta { font-size: 13px; color: #5b5752; margin-top: 16px; }
      .code { font-family: "Courier New", monospace; font-size: 13px; background: #f3f0ea; padding: 10px; border-radius: 8px; word-break: break-all; }
      .footer { margin-top: 22px; font-size: 12px; color: #6f6b65; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="card">
        <span class="badge">${badge}</span>
        <h1>${title}</h1>
        <p>${content}</p>
        <a class="cta" href="${ctaUrl}">${ctaText}</a>
        <div class="footer">
          <p><strong>About Transfer Legacy</strong><br>Secure your digital assets for the next generation. Visit <a href="https://transferlegacy.com" style="color: #1f1d1b;">transferlegacy.com</a></p>
        </div>
      </div>
    </div>
  </body>
</html>`;

    const defaults = [
      {
        name: 'Legacy Invitation',
        subject: 'Invitation to {{params.policy_name}}',
        category: 'Invitation',
        body_html: createTemplateBody(
          'Inheritance Plan Access',
          'INVITATION',
          '{{params.owner_name}} has invited you to join their secure inheritance plan <strong>"{{params.policy_name}}"</strong>. This plan ensures that digital assets are distributed according to their wishes.',
          'Accept Invitation',
          '{{params.invite_url}}'
        ),
        workspace_id: workspaceId
      },
      {
        name: 'Security Alert',
        subject: 'Security Alert: New Device Detected',
        category: 'Security',
        body_html: createTemplateBody(
          'Node Authorization Required',
          'SECURITY',
          'A new device was detected attempting to access your legacy vault. If this was not you, please rotate your master keys immediately.',
          'Review Activity',
          '{{params.app_url}}/security'
        ),
        workspace_id: workspaceId
      },
      {
        name: 'Vault Backup Success',
        subject: 'Scheduled Backup Completed',
        category: 'System',
        body_html: createTemplateBody(
          'Backup Integrity Verified',
          'SYSTEM',
          'The weekly encrypted backup of your workspace <strong>{{workspace_name}}</strong> has been successfully uploaded to your designated storage node.',
          'View Logs',
          '{{params.app_url}}/backups'
        ),
        workspace_id: workspaceId
      },
      {
        name: 'Document Verified',
        subject: 'Legal Document Verification Successful',
        category: 'Compliance',
        body_html: createTemplateBody(
          'Notarization Confirmed',
          'COMPLIANCE',
          'Your uploaded document <strong>{{params.doc_name}}</strong> has been successfully verified and time-stamped on the blockchain.',
          'Download Receipt',
          '{{params.receipt_url}}'
        ),
        workspace_id: workspaceId
      },
      {
        name: 'Trial Ending Soon',
        subject: 'Your Enterprise Trial is Ending',
        category: 'Billing',
        body_html: createTemplateBody(
          'Maximize Your Legacy',
          'BILLING',
          'Your trial period ends in 3 days. Upgrade to a lifetime license now to ensure uninterrupted access to your inheritance nodes.',
          'Upgrade Now',
          '{{params.app_url}}/billing'
        ),
        workspace_id: workspaceId
      },
      {
        name: 'New Message Received',
        subject: 'You have a secure message',
        category: 'Communication',
        body_html: createTemplateBody(
          'Encrypted Signal Received',
          'INBOX',
          'A new encrypted message has arrived in your unified inbox from <strong>{{params.sender_name}}</strong>.',
          'Open Inbox',
          '{{params.app_url}}/inbox'
        ),
        workspace_id: workspaceId
      },
      {
        name: 'Policy Updated',
        subject: 'Update to your inheritance policy',
        category: 'Legal',
        body_html: createTemplateBody(
          'Policy Revision Detected',
          'UPDATE',
          'A change has been recorded in the policy <strong>{{params.policy_name}}</strong>. Please review the modifications to ensure they align with your requirements.',
          'Review Changes',
          '{{params.app_url}}/policies'
        ),
        workspace_id: workspaceId
      },
      {
        name: 'Beneficiary Onboarding',
        subject: 'Step 1: Setting up your account',
        category: 'Onboarding',
        body_html: createTemplateBody(
          'Welcome to the Legacy Network',
          'ONBOARDING',
          'You have been named a beneficiary. Let\'s get your secure environment set up so you can access your inheritance when the time comes.',
          'Start Setup',
          '{{params.onboarding_url}}'
        ),
        workspace_id: workspaceId
      },
      {
        name: 'Milestone Achievement',
        subject: 'Legacy Score Improved!',
        category: 'Gamification',
        body_html: createTemplateBody(
          'Legacy Readiness Level Up',
          'MILESTONE',
          'Congratulations! By verifying your backup nodes, your Legacy Readiness Score has increased to <strong>{{params.score}}%</strong>.',
          'View Dashboard',
          '{{params.app_url}}/overview'
        ),
        workspace_id: workspaceId
      },
      {
        name: 'Referral Program',
        subject: 'Help a friend secure their legacy',
        category: 'Marketing',
        body_html: createTemplateBody(
          'Share the Security',
          'REFERRAL',
          'Know someone who needs to secure their digital life? Invite them to TL Connect and both of you will receive 3 months of Enterprise features.',
          'Get Referral Link',
          '{{params.app_url}}/refer'
        ),
        workspace_id: workspaceId
      },
      {
        name: 'Annual Security Review',
        subject: 'Time for your annual legacy audit',
        category: 'Security',
        body_html: createTemplateBody(
          'Full Node Integrity Check',
          'ANNUAL AUDIT',
          'It\'s been a year since your last full security audit. Let\'s run a complete diagnostic on all your inheritance plan nodes.',
          'Start Audit',
          '{{params.app_url}}/audit'
        ),
        workspace_id: workspaceId
      }
    ];

    const { error: insertError } = await supabaseAdmin
      .from('templates')
      .insert(defaults);

    if (insertError) throw insertError;
  }
}
