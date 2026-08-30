import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { apiClient } from '@/src/lib/apiClient';
import { Calendar, Clock, Filter, Server, Users, Sparkles, AlertCircle, Save } from 'lucide-react';

interface CampaignFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CampaignForm({ initialData, onSubmit, onCancel, isSubmitting }: CampaignFormProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    templateId: initialData?.template_id || initialData?.templateId || '',
    targetCategory: initialData?.target_category || initialData?.targetCategory || 'ALL',
    targetStatus: initialData?.target_status || initialData?.targetStatus || 'ALL',
    providerId: initialData?.provider_id || initialData?.providerId || '',
    scheduledAtDate: initialData?.scheduled_at ? new Date(initialData.scheduled_at).toISOString().split('T')[0] : '',
    scheduledAtTime: initialData?.scheduled_at ? new Date(initialData.scheduled_at).toTimeString().slice(0, 5) : '',
    isScheduled: !!initialData?.scheduled_at
  });

  const [templates, setTemplates] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [matchingLeadsCount, setMatchingLeadsCount] = useState<number | null>(null);
  const [totalLeadsCount, setTotalLeadsCount] = useState<number | null>(null);
  const [allLeads, setAllLeads] = useState<any[]>([]);
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
        
        const leads = leadsRes.data || [];
        setAllLeads(leads);
        setTotalLeadsCount(leads.length);
      } catch (err) {
        console.error('Failed to load campaign metadata:', err);
      } finally {
        setLoadingMetadata(false);
      }
    }
    loadMetadata();
  }, []);

  // Recalculate matching leads when target filters change
  useEffect(() => {
    if (!allLeads.length) return;
    const matching = allLeads.filter(l => {
      const matchCat = formData.targetCategory === 'ALL' || (l.category || 'Outbound') === formData.targetCategory;
      const matchStatus = formData.targetStatus === 'ALL' || l.status === formData.targetStatus;
      return matchCat && matchStatus;
    });
    setMatchingLeadsCount(matching.length);
  }, [allLeads, formData.targetCategory, formData.targetStatus]);

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
        <Label htmlFor="name" className="text-xs text-neutral-300 font-bold uppercase tracking-wider">Campaign Name *</Label>
        <Input 
          id="name" 
          value={formData.name} 
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Q4 Executive Outreach - Enterprise"
          className="bg-neutral-900 border-neutral-800 text-white"
          required
        />
      </div>

      {/* Blueprint Template Selection */}
      <div className="space-y-2">
        <Label htmlFor="template" className="flex items-center gap-1.5 text-xs text-neutral-300 font-bold uppercase tracking-wider">
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
          {matchingLeadsCount !== null && (
            <span className="text-[11px] text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
              <span className="text-emerald-400 font-bold">{matchingLeadsCount}</span> of {totalLeadsCount} leads targeted
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
                className="bg-neutral-900 border-neutral-800 text-xs text-white"
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
                className="bg-neutral-900 border-neutral-800 text-xs text-white"
                required={formData.isScheduled}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={isSubmitting || !formData.name || !formData.templateId || (formData.isScheduled && (!formData.scheduledAtDate || !formData.scheduledAtTime))}
          variant="white"
        >
          {isSubmitting ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Campaign Changes' : 'Create Outreach Campaign')}
        </Button>
      </div>
    </form>
  );
}
