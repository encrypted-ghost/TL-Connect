import { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { cn } from '@/src/lib/utils';

interface TemplateFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function TemplateForm({ initialData, onSubmit, onCancel, isSubmitting }: TemplateFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    subject: initialData?.subject || '',
    category: initialData?.category || 'General',
    bodyHtml: initialData?.bodyHtml || ''
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Template Name</Label>
          <Input 
            id="name" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Welcome Email"
            className="bg-neutral-900 border-neutral-800"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <div className="flex flex-col gap-2">
            <Input 
              id="category" 
              value={formData.category} 
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g. Onboarding"
              className="bg-neutral-900 border-neutral-800"
            />
            <div className="flex flex-wrap gap-1.5">
              {['Welcome', 'Follow-up', 'Newsletter', 'Marketing', 'Transactional', 'Security'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium border transition-colors",
                    formData.category === cat 
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                      : "bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Email Subject</Label>
        <Input 
          id="subject" 
          value={formData.subject} 
          onChange={e => setFormData({ ...formData, subject: e.target.value })}
          placeholder="e.g. Welcome to {{brand_name}}!"
          className="bg-neutral-900 border-neutral-800"
        />
      </div>

      <div className="space-y-2">
        <Label>Content Editor</Label>
        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="bg-neutral-900 border border-neutral-800 p-1">
            <TabsTrigger value="edit" className="text-xs data-[state=active]:bg-neutral-800">Edit HTML</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs data-[state=active]:bg-neutral-800">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="mt-2">
            <textarea
              value={formData.bodyHtml}
              onChange={e => setFormData({ ...formData, bodyHtml: e.target.value })}
              className="w-full h-80 p-4 bg-neutral-950 border border-neutral-800 rounded-lg font-mono text-sm focus:outline-none focus:ring-1 focus:ring-neutral-700"
              placeholder="<h1>Hi {{first_name}}</h1>..."
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-2">
            <div 
              className="w-full h-80 p-4 bg-white rounded-lg overflow-auto prose prose-sm max-w-none text-black"
              dangerouslySetInnerHTML={{ __html: formData.bodyHtml.replace(/{{.*?}}/g, '<span class="bg-yellow-200 px-1 rounded">Variable</span>') }}
            />
          </TabsContent>
        </Tabs>
        <p className="text-[10px] text-neutral-500 mt-2">
          Tip: Use <code className="text-neutral-300">{"{{variable_name}}"}</code> for dynamic content.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={() => onSubmit(formData)} 
          disabled={isSubmitting || !formData.name || !formData.bodyHtml}
          className="bg-white text-black hover:bg-neutral-200"
        >
          {isSubmitting ? 'Saving...' : 'Save Template'}
        </Button>
      </div>
    </div>
  );
}
