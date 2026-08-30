import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { apiClient } from '@/src/lib/apiClient';
import { Calendar, Clock, Filter, Server, Users, Sparkles, AlertCircle } from 'lucide-react';

interface CampaignFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CampaignForm({ onSubmit, onCancel, isSubmitting }: CampaignFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    templateId: '',
    targetCategory: 'ALL',
    targetStatus: 'ALL',
    providerId: '',
    scheduledAtDate: '',
    scheduledAtTime: '',
    isScheduled: false
  });

  const [templates, setTemplates] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [leadCount, setLeadCount] = useState<number | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [templatesRes, providersRes, leadsRes] = await Promise.all([
          apiClient.get('/templates').catch(() => ({ data: [] })),
          apiClient.get('/settings/email-providers').catch(() => ({ data: [] })),
          apiClient.get('/leads').catch(() => ({ data: [] }))
        ]);

        setTemplates(templatesRes.data || []);
        setProviders(providersRes.data || []);
        
        // Count matching leads
        const allLeads = leadsRes.data || [];
        setLeadCount(allLeads.length);
      } catch (err) {
        console.error('Failed to load campaign metadata:', err);
      } finally {
        setLoadingMetadata(false);
      }
    }
    loadMetadata();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let scheduledAt = null;
    if (formData.isScheduled && formData.scheduledAtDate && formData.scheduledAtTime) {
      scheduledAt = new Date(`${formData.scheduledAtDate}T${formData.scheduledAtTime}`).toISOString();
    }

    onSubmit({
      name: formData.name,
      templateId: formData.templateId,
      targetCategory: formData.targetCategory,
      targetStatus: formData.targetStatus,
      providerId: formData.providerId || null,
      scheduledAt
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Campaign Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Campaign Name *</Label>
        <Input 
          id="name" 
          value={formData.name} 
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Q4 Executive Outreach - Enterprise"
          className="bg-neutral-900 border-neutral-800"
          required
        />
      </div>

      {/* Blueprint Template Selection */}
      <div className="space-y-2">
        <Label htmlFor="template" className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-indigo-400" /> Email Blueprint Template *
        </Label>
        <select
          id="template"
          value={formData.templateId}
          onChange={e => setFormData({ ...formData, templateId: e.target.value })}
          className="w-full h-10 px-3 rounded-md border border-neutral-800 bg-neutral-900 text-sm focus:border-indigo-500 outline-none text-neutral-200"
          required
        >
          <option value="">-- Select Template --</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name} (Subject: {t.subject})</option>
          ))}
        </select>
      </div>

      {/* Audience Targeting & Management Controls */}
      <div className="p-4 rounded-xl bg-[#111114] border border-[#27272a] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">Audience Segmentation & Control</span>
          </div>
          {leadCount !== null && (
            <span className="text-[11px] text-neutral-400">
              <span className="text-emerald-400 font-bold">{leadCount}</span> total leads in CRM
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase text-neutral-400 tracking-wider">Target Lead Category</Label>
            <select
              value={formData.targetCategory}
              onChange={e => setFormData({ ...formData, targetCategory: e.target.value })}
              className="w-full h-9 px-3 rounded-md border border-neutral-800 bg-[#18181b] text-xs text-neutral-200 focus:border-indigo-500 outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="Outbound">Outbound Only</option>
              <option value="Inbound">Inbound Only</option>
              <option value="Cold Outreach">Cold Outreach Only</option>
              <option value="Enterprise">Enterprise Only</option>
              <option value="SMB">SMB Only</option>
              <option value="VIP">VIP Only</option>
              <option value="Partner">Partner Only</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase text-neutral-400 tracking-wider">Target Lead Status</Label>
            <select
              value={formData.targetStatus}
              onChange={e => setFormData({ ...formData, targetStatus: e.target.value })}
              className="w-full h-9 px-3 rounded-md border border-neutral-800 bg-[#18181b] text-xs text-neutral-200 focus:border-indigo-500 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New (Uncontacted)</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="CONTACTED">Contacted</option>
            </select>
          </div>
        </div>

        {/* Email Dispatcher Selection */}
        <div className="space-y-1.5 pt-2 border-t border-[#27272a]">
          <Label className="text-[10px] uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
            <Server size={12} className="text-indigo-400" /> Outbound Dispatcher Provider
          </Label>
          <select
            value={formData.providerId}
            onChange={e => setFormData({ ...formData, providerId: e.target.value })}
            className="w-full h-9 px-3 rounded-md border border-neutral-800 bg-[#18181b] text-xs text-neutral-200 focus:border-indigo-500 outline-none"
          >
            <option value="">Default Workspace Provider (Auto-selected)</option>
            {providers.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.provider_type.toUpperCase()}) {p.is_default ? '★ Default' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scheduling Option */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <input 
            type="checkbox" 
            id="isScheduled" 
            checked={formData.isScheduled}
            onChange={e => setFormData({ ...formData, isScheduled: e.target.checked })}
            className="rounded border-neutral-800 bg-neutral-900 text-indigo-500"
          />
          <Label htmlFor="isScheduled" className="cursor-pointer text-xs text-neutral-300">Schedule execution for future date/time</Label>
        </div>

        {formData.isScheduled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#111114] border border-[#27272a]">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs">
                <Calendar size={14} className="text-neutral-500" />
                Date
              </Label>
              <Input 
                type="date"
                value={formData.scheduledAtDate}
                onChange={e => setFormData({ ...formData, scheduledAtDate: e.target.value })}
                className="bg-neutral-900 border-neutral-800 text-xs"
                required={formData.isScheduled}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs">
                <Clock size={14} className="text-neutral-500" />
                Time
              </Label>
              <Input 
                type="time"
                value={formData.scheduledAtTime}
                onChange={e => setFormData({ ...formData, scheduledAtTime: e.target.value })}
                className="bg-neutral-900 border-neutral-800 text-xs"
                required={formData.isScheduled}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={isSubmitting || !formData.name || !formData.templateId || (formData.isScheduled && (!formData.scheduledAtDate || !formData.scheduledAtTime))}
          variant="white"
        >
          {isSubmitting ? 'Creating Campaign...' : 'Create Outreach Campaign'}
        </Button>
      </div>
    </form>
  );
}
