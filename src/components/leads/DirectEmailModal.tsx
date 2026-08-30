import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { apiClient } from '@/src/lib/apiClient';
import { getErrorMessage } from '@/src/lib/utils';
import { Send, Mail, Building, User, Sparkles } from 'lucide-react';

interface DirectEmailModalProps {
  lead: any | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DirectEmailModal({ lead, isOpen, onOpenChange, onSuccess }: DirectEmailModalProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load templates
    const loadTemplates = async () => {
      try {
        const res = await apiClient.get('/templates');
        setTemplates(res.data || []);
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    };
    loadTemplates();

    if (lead) {
      setSubject(`Connecting with ${lead.first_name || 'you'}`);
      setHtml(`
<p>Hi ${lead.first_name || 'there'},</p>
<p>I came across your work at <strong>${lead.company_name || lead.company?.name || 'your company'}</strong> and wanted to reach out directly.</p>
<p>Would you have 10 minutes for a brief chat this week?</p>
<p>Best regards,<br/>Transfer Legacy Team</p>
      `.trim());
    }
  }, [isOpen, lead]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const t = templates.find(t => t.id === templateId);
    if (t) {
      setSubject(t.subject || subject);
      let body = t.body_html || '';
      if (lead) {
        body = body.replace(/\{\{first_name\}\}/gi, lead.first_name || 'there');
        body = body.replace(/\{\{last_name\}\}/gi, lead.last_name || '');
        body = body.replace(/\{\{company\}\}/gi, lead.company_name || lead.company?.name || 'your company');
      }
      setHtml(body);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    if (!subject.trim() || !html.trim()) {
      toast.error('Subject and email body are required');
      return;
    }

    setIsSending(true);
    try {
      await apiClient.post(`/leads/${lead.id}/send-email`, {
        subject,
        html
      });
      toast.success(`Email successfully dispatched to ${lead.email}`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Failed to send email'));
    } finally {
      setIsSending(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#09090b] border-[#27272a] text-white p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Send size={18} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">Direct Email Dispatch</DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Send a 1-to-1 message directly to <span className="text-indigo-300 font-semibold">{lead.first_name} {lead.last_name}</span> ({lead.email})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSend} className="space-y-4 mt-2">
          {/* Recipient Details Pill */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#111114] border border-[#27272a] text-xs">
            <div className="flex items-center gap-2">
              <User size={14} className="text-neutral-500" />
              <span className="font-semibold text-neutral-200">{lead.first_name} {lead.last_name}</span>
              <span className="text-neutral-500">•</span>
              <span className="text-neutral-400 font-mono">{lead.email}</span>
            </div>
            {(lead.company_name || lead.company?.name) && (
              <div className="flex items-center gap-1.5 text-neutral-400">
                <Building size={12} />
                <span>{lead.company_name || lead.company?.name}</span>
              </div>
            )}
          </div>

          {/* Quick Template Picker */}
          {templates.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-400" /> Load Blueprint Template (Optional)
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-xs focus:border-indigo-500 outline-none text-neutral-200"
              >
                <option value="">-- Custom Compose --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
                ))}
              </select>
            </div>
          )}

          {/* Subject Line */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
              <Mail size={12} /> Subject Line *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none text-white transition-colors"
              placeholder="e.g. Quick intro regarding Transfer Legacy"
            />
          </div>

          {/* Email Body (HTML / Rich text) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">
              Message Content (HTML Supported)
            </label>
            <textarea
              rows={8}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              required
              className="w-full bg-[#18181b] border border-[#27272a] rounded-md p-3 text-xs font-mono focus:border-indigo-500 outline-none text-neutral-200 resize-none transition-colors"
              placeholder="Write your email content here..."
            />
            <p className="text-[10px] text-neutral-500">
              Variables supported: <code className="text-indigo-400">{'{{first_name}}'}</code>, <code className="text-indigo-400">{'{{company}}'}</code>, <code className="text-indigo-400">{'{{email}}'}</code>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#27272a]">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button type="submit" variant="white" disabled={isSending} className="flex items-center gap-2">
              <Send size={14} />
              {isSending ? 'Sending Email...' : 'Send Message Now'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
