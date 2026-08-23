import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { apiClient } from '@/src/lib/apiClient';
import { Calendar, Clock } from 'lucide-react';

interface CampaignFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CampaignForm({ onSubmit, onCancel, isSubmitting }: CampaignFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    templateId: '',
    scheduledAtDate: '',
    scheduledAtTime: '',
    isScheduled: false
  });
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await apiClient.get('/templates');
        setTemplates(res.data);
      } catch (err) {
        console.error('Failed to fetch templates', err);
      } finally {
        setLoadingTemplates(false);
      }
    }
    fetchTemplates();
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
      scheduledAt
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Campaign Name</Label>
        <Input 
          id="name" 
          value={formData.name} 
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Q4 Outreach"
          className="bg-neutral-900 border-neutral-800"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template">Email Template</Label>
        <select
          id="template"
          value={formData.templateId}
          onChange={e => setFormData({ ...formData, templateId: e.target.value })}
          className="w-full h-9 px-3 rounded-md border border-neutral-800 bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-700"
          required
        >
          <option value="">Select a template</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {loadingTemplates && <p className="text-[10px] text-neutral-500">Loading templates...</p>}
      </div>

      <div className="pt-4 border-t border-neutral-800">
        <div className="flex items-center gap-2 mb-4">
          <input 
            type="checkbox" 
            id="isScheduled" 
            checked={formData.isScheduled}
            onChange={e => setFormData({ ...formData, isScheduled: e.target.checked })}
            className="rounded border-neutral-800 bg-neutral-900 text-indigo-500 focus:ring-offset-neutral-950"
          />
          <Label htmlFor="isScheduled" className="cursor-pointer">Schedule for later</Label>
        </div>

        {formData.isScheduled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar size={14} className="text-neutral-500" />
                Date
              </Label>
              <Input 
                type="date"
                value={formData.scheduledAtDate}
                onChange={e => setFormData({ ...formData, scheduledAtDate: e.target.value })}
                className="bg-neutral-900 border-neutral-800"
                required={formData.isScheduled}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock size={14} className="text-neutral-500" />
                Time
              </Label>
              <Input 
                type="time"
                value={formData.scheduledAtTime}
                onChange={e => setFormData({ ...formData, scheduledAtTime: e.target.value })}
                className="bg-neutral-900 border-neutral-800"
                required={formData.isScheduled}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={isSubmitting || !formData.name || !formData.templateId || (formData.isScheduled && (!formData.scheduledAtDate || !formData.scheduledAtTime))}
          className="bg-white text-black hover:bg-neutral-200"
        >
          {isSubmitting ? 'Creating...' : 'Create Campaign'}
        </Button>
      </div>
    </form>
  );
}
