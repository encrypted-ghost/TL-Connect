import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Badge } from '@/src/components/ui/badge';
import { 
  Smartphone, 
  Monitor, 
  Code, 
  Eye, 
  Sparkles, 
  Copy, 
  Check, 
  Layers,
  FileCode,
  Zap,
  Info
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { renderMjmlToHtml } from '@/src/lib/mjmlRenderer';

interface TemplateFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const STARTER_BLUEPRINTS: Record<string, { name: string; subject: string; category: string; mjml: string }> = {
  cold_outreach: {
    name: 'Executive Cold Pitch',
    subject: 'Quick question regarding {{company}}',
    category: 'Outreach',
    mjml: `<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f8fafc">
    <mj-section padding="30px 20px" background-color="#ffffff" border-radius="8px">
      <mj-column>
        <mj-text font-size="18px" font-weight="700" color="#0f172a" line-height="1.4">
          Hi {{first_name}},
        </mj-text>
        <mj-text font-size="15px" color="#334155" line-height="1.6">
          I noticed your team's work at <strong>{{company}}</strong> and wanted to reach out directly.
        </mj-text>
        <mj-text font-size="15px" color="#334155" line-height="1.6">
          We help industry leaders streamline their outreach operations and secure high-value partnerships with automated multi-channel delivery.
        </mj-text>
        <mj-button background-color="#4f46e5" color="#ffffff" font-weight="600" border-radius="6px" href="https://transferlegacy.com" padding="20px 0">
          Explore Our Framework
        </mj-button>
        <mj-text font-size="15px" color="#334155" line-height="1.6">
          Do you have 10 minutes this Thursday for a brief discussion?
        </mj-text>
        <mj-text font-size="14px" color="#64748b" padding-top="20px">
          Best regards,<br/>
          <strong>Transfer Legacy Team</strong>
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section padding="20px">
      <mj-column>
        <mj-text font-size="12px" color="#94a3b8" align="center">
          To stop receiving outreach from us, <a href="{{unsubscribe_link}}" style="color: #6366f1;">unsubscribe here</a>.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`
  },
  meeting_booking: {
    name: 'Meeting & Demo Request',
    subject: '15-minute sync for {{company}}',
    category: 'Follow-up',
    mjml: `<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#0f172a">
    <mj-section background-color="#1e293b" border-radius="12px" padding="30px 20px" border="1px solid #334155">
      <mj-column>
        <mj-text font-size="20px" font-weight="bold" color="#ffffff">
          Sync with {{company}}
        </mj-text>
        <mj-text font-size="15px" color="#cbd5e1" line-height="1.6">
          Hi {{first_name}}, following up on our previous note. I would love to walk you through how we can solve your deliverability and lead routing challenges.
        </mj-text>
        <mj-button background-color="#6366f1" color="#ffffff" font-weight="bold" border-radius="8px" href="https://calendly.com">
          Book 15-Min Meeting
        </mj-button>
        <mj-text font-size="13px" color="#94a3b8" padding-top="20px">
          Cheers,<br/>Transfer Legacy HQ
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`
  },
  case_study: {
    name: 'Case Study & Social Proof',
    subject: 'How similar companies scaled with TL Connect',
    category: 'Marketing',
    mjml: `<mjml>
  <mj-body background-color="#f1f5f9">
    <mj-section background-color="#ffffff" padding="30px 20px">
      <mj-column>
        <mj-text font-size="22px" font-weight="800" color="#1e1b4b">
          Real Results for Fast-Growing Teams
        </mj-text>
        <mj-text font-size="15px" color="#475569" line-height="1.6">
          Hey {{first_name}}, here is how other teams in your space achieved a 42% reply rate without getting blocked.
        </mj-text>
        <mj-divider border-color="#e2e8f0" border-width="1px" />
        <mj-text font-size="14px" color="#334155" line-height="1.6">
          • <strong>Zero DNS flags</strong> with automated IP warmups<br/>
          • <strong>Dynamic multi-provider failover</strong> (Brevo, Resend, SES)<br/>
          • <strong>Instant responsive formatting</strong> on Outlook and mobile
        </mj-text>
        <mj-button background-color="#0f172a" color="#ffffff" href="https://transferlegacy.com">
          Read the Full Case Study
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`
  }
};

const VARIABLE_CHIPS = [
  { label: 'First Name', tag: '{{first_name}}' },
  { label: 'Last Name', tag: '{{last_name}}' },
  { label: 'Company', tag: '{{company}}' },
  { label: 'Title', tag: '{{title}}' },
  { label: 'Email', tag: '{{email}}' },
  { label: 'Unsubscribe Link', tag: '{{unsubscribe_link}}' },
];

export function TemplateForm({ initialData, onSubmit, onCancel, isSubmitting }: TemplateFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [subject, setSubject] = useState(initialData?.subject || '');
  const [category, setCategory] = useState(initialData?.category || 'Outreach');
  
  // Format mode: 'mjml' or 'html'
  const isInitialMjml = initialData?.bodyHtml?.includes('<mjml>') || initialData?.body_html?.includes('<mjml>');
  const [mode, setMode] = useState<'mjml' | 'html'>(isInitialMjml ? 'mjml' : 'mjml');
  
  const [code, setCode] = useState(
    initialData?.bodyHtml || initialData?.body_html || STARTER_BLUEPRINTS.cold_outreach.mjml
  );

  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // Compile MJML to HTML in real-time
  const compiledOutput = useMemo(() => {
    if (mode === 'html') {
      return { html: code, errors: [] };
    }

    try {
      const result = renderMjmlToHtml(code);
      return { html: result.html || '', errors: result.errors || [] };
    } catch (err: any) {
      return { html: `<div style="color: red; padding: 20px;">MJML Compile Error: ${err.message}</div>`, errors: [err] };
    }
  }, [code, mode]);

  // Insert variable into active editor
  const handleInsertVariable = (tag: string) => {
    setCode((prev: string) => prev + ' ' + tag);
    setCopiedVariable(tag);
    setTimeout(() => setCopiedVariable(null), 1500);
  };

  const handleSelectBlueprint = (key: string) => {
    const blueprint = STARTER_BLUEPRINTS[key];
    if (blueprint) {
      setName(blueprint.name);
      setSubject(blueprint.subject);
      setCategory(blueprint.category);
      setCode(blueprint.mjml);
      setMode('mjml');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      subject,
      category,
      bodyHtml: compiledOutput.html || code,
      rawTemplate: code,
      templateType: mode,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header: Meta Information */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Template Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q3 Cold Outreach"
            className="mt-1 bg-[#18181b] border-[#27272a] text-white"
            required
          />
        </div>

        <div>
          <Label className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Category</Label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Outreach, Follow-up"
            className="mt-1 bg-[#18181b] border-[#27272a] text-white"
            required
          />
        </div>

        <div>
          <Label className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Starter Blueprint</Label>
          <select
            onChange={(e) => handleSelectBlueprint(e.target.value)}
            defaultValue=""
            className="w-full mt-1 bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="" disabled>Load Pre-built Blueprint...</option>
            <option value="cold_outreach">Executive Cold Pitch (MJML)</option>
            <option value="meeting_booking">Meeting & Demo Request (Dark)</option>
            <option value="case_study">Case Study & Social Proof (MJML)</option>
          </select>
        </div>
      </div>

      {/* Subject Line */}
      <div>
        <Label className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Email Subject Line</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Quick question regarding {{company}}"
          className="mt-1 bg-[#18181b] border-[#27272a] text-white"
          required
        />
      </div>

      {/* Variable Chips Toolbar */}
      <div className="p-3 bg-[#111114] border border-[#27272a] rounded-xl flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mr-2 flex items-center gap-1">
          <Sparkles size={12} className="text-indigo-400" /> Insert Variable:
        </span>
        {VARIABLE_CHIPS.map((chip) => (
          <button
            key={chip.tag}
            type="button"
            onClick={() => handleInsertVariable(chip.tag)}
            className="px-2.5 py-1 bg-[#18181b] hover:bg-indigo-600 hover:text-white border border-[#27272a] hover:border-indigo-500 rounded-md text-[11px] font-mono text-neutral-300 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>{chip.label}</span>
            <code className="text-[10px] text-neutral-500 group-hover:text-white">{chip.tag}</code>
            {copiedVariable === chip.tag && <Check size={11} className="text-emerald-400" />}
          </button>
        ))}
      </div>

      {/* Studio Header: Mode Switcher & Device Toggles */}
      <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
        {/* Editor Mode */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('mjml')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5",
              mode === 'mjml'
                ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                : "bg-[#18181b] text-neutral-400 hover:text-white"
            )}
          >
            <Layers size={13} />
            <span>MJML Responsive Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('html')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5",
              mode === 'html'
                ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                : "bg-[#18181b] text-neutral-400 hover:text-white"
            )}
          >
            <Code size={13} />
            <span>Raw HTML Mode</span>
          </button>
        </div>

        {/* Device Viewport Toggles */}
        <div className="flex items-center gap-1 bg-[#18181b] p-1 rounded-lg border border-[#27272a]">
          <button
            type="button"
            onClick={() => setDeviceView('desktop')}
            className={cn(
              "p-1.5 rounded-md transition-all",
              deviceView === 'desktop' ? "bg-indigo-600 text-white" : "text-neutral-400 hover:text-white"
            )}
            title="Desktop View (600px)"
          >
            <Monitor size={15} />
          </button>

          <button
            type="button"
            onClick={() => setDeviceView('mobile')}
            className={cn(
              "p-1.5 rounded-md transition-all",
              deviceView === 'mobile' ? "bg-indigo-600 text-white" : "text-neutral-400 hover:text-white"
            )}
            title="Mobile View (375px)"
          >
            <Smartphone size={15} />
          </button>
        </div>
      </div>

      {/* Split-Pane Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[520px]">
        {/* Left Pane: Code Editor */}
        <div className="flex flex-col h-full bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden shadow-inner">
          <div className="px-4 py-2 bg-[#111114] border-b border-[#27272a] flex items-center justify-between text-xs text-neutral-400">
            <span className="font-mono flex items-center gap-1.5 font-bold uppercase text-[10px]">
              <FileCode size={13} className="text-indigo-400" />
              {mode.toUpperCase()} Editor
            </span>
            <span className="text-[10px] text-neutral-500">Live Auto-Compile</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 w-full p-4 bg-transparent font-mono text-xs text-neutral-200 resize-none focus:outline-none scrollbar-thin scrollbar-thumb-neutral-800 leading-relaxed"
            placeholder={mode === 'mjml' ? '<mjml>\n  <mj-body>\n    ...\n  </mj-body>\n</mjml>' : '<div>Your HTML...</div>'}
            spellCheck={false}
          />
        </div>

        {/* Right Pane: Live Sandboxed Preview */}
        <div className="flex flex-col h-full bg-[#111114] border border-[#27272a] rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5 font-bold uppercase text-[10px]">
              <Eye size={13} className="text-emerald-400" /> Live Preview Simulator ({deviceView})
            </span>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-black uppercase">
              100% Responsive
            </Badge>
          </div>

          <div className="flex-1 bg-[#09090b] p-4 flex justify-center items-center overflow-auto">
            <div
              className={cn(
                "h-full bg-white rounded-lg shadow-2xl transition-all duration-300 overflow-hidden border border-neutral-700",
                deviceView === 'desktop' ? "w-full max-w-[600px]" : "w-[375px]"
              )}
            >
              <iframe
                title="Email Preview"
                srcDoc={compiledOutput.html.replace(/{{(.*?)}}/g, '<span style="background-color: #fef08a; padding: 2px 4px; border-radius: 4px; font-weight: bold; color: #1e1b4b;">$1</span>')}
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-[#27272a]">
        <div className="text-xs text-neutral-500 flex items-center gap-1.5">
          <Info size={14} className="text-indigo-400" />
          <span>Emails automatically compile to responsive HTML across Outlook, Gmail & Apple Mail.</span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-neutral-800 text-neutral-400"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="white"
            disabled={isSubmitting}
            className="font-bold uppercase text-[11px] tracking-widest px-6 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          >
            {isSubmitting ? 'Saving...' : 'Save Template Blueprint'}
          </Button>
        </div>
      </div>
    </form>
  );
}
