import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Badge } from '@/src/components/ui/badge';
import { 
  Server, 
  Plus, 
  Trash2, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles,
  Zap,
  Globe,
  Star,
  Settings2,
  RefreshCw
} from 'lucide-react';
import { apiClient } from '@/src/lib/apiClient';
import { toast } from 'sonner';

export interface EmailProviderRecord {
  id: string;
  provider_type: 'brevo' | 'resend' | 'sendgrid' | 'postmark' | 'mailjet' | 'mailgun' | 'smtp';
  name: string;
  is_active: boolean;
  is_default: boolean;
  from_email: string;
  from_name: string;
  reply_to?: string;
  credentials: Record<string, any>;
  daily_limit: number;
  created_at: string;
}

const PROVIDER_METADATA: Record<string, { name: string; tag: string; badgeColor: string; description: string; fields: { key: string; label: string; placeholder: string; type?: string; default?: any }[] }> = {
  brevo: {
    name: 'Brevo (Sendinblue)',
    tag: '300 Free / Day',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    description: 'v3 Transactional REST API. Clean emails with zero required watermarks on direct API sends.',
    fields: [
      { key: 'apiKey', label: 'Brevo API Key (v3)', placeholder: 'xkeysib-xxxxxxxxxxxx...', type: 'password' }
    ]
  },
  resend: {
    name: 'Resend',
    tag: '100% White-label',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    description: 'Modern developer-first email platform. 3,000 free emails/month, 0% branding/watermark.',
    fields: [
      { key: 'apiKey', label: 'Resend API Key', placeholder: 're_xxxxxxxxxxxx...', type: 'password' }
    ]
  },
  sendgrid: {
    name: 'Twilio SendGrid',
    tag: '100 Free / Day',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    description: 'Enterprise deliverability and high-throughput v3 Mail API.',
    fields: [
      { key: 'apiKey', label: 'SendGrid API Key', placeholder: 'SG.xxxxxxxxxxxx...', type: 'password' }
    ]
  },
  postmark: {
    name: 'Postmark',
    tag: 'High Deliverability',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    description: 'Industry benchmark for transactional speed and primary inbox deliverability.',
    fields: [
      { key: 'serverToken', label: 'Server API Token', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', type: 'password' }
    ]
  },
  mailjet: {
    name: 'Mailjet',
    tag: '6,000 / Month',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    description: 'European compliant cloud transactional email with v3.1 Send API.',
    fields: [
      { key: 'apiKey', label: 'Mailjet API Key', placeholder: 'Public API Key' },
      { key: 'apiSecret', label: 'Mailjet Secret Key', placeholder: 'Secret Key', type: 'password' }
    ]
  },
  mailgun: {
    name: 'Mailgun',
    tag: 'API Relay',
    badgeColor: 'bg-red-500/10 text-red-400 border-red-500/20',
    description: 'Powerful transactional message delivery and inbound routing.',
    fields: [
      { key: 'apiKey', label: 'Mailgun API Key', placeholder: 'key-xxxxxxxxxxxx...', type: 'password' },
      { key: 'domain', label: 'Sending Domain', placeholder: 'mg.yourdomain.com' },
      { key: 'region', label: 'Region (us or eu)', placeholder: 'us', default: 'us' }
    ]
  },
  smtp: {
    name: 'Universal SMTP / SES / Stalwart',
    tag: 'Custom Relay',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    description: 'Direct SMTP transport. Connect your self-hosted Stalwart server, Amazon SES, or custom mail relay.',
    fields: [
      { key: 'host', label: 'SMTP Host', placeholder: 'email-smtp.us-east-1.amazonaws.com or mail.yourdomain.com' },
      { key: 'port', label: 'SMTP Port', placeholder: '587', default: 587 },
      { key: 'user', label: 'SMTP Username', placeholder: 'username or Access Key ID' },
      { key: 'pass', label: 'SMTP Password', placeholder: 'password or Secret Access Key', type: 'password' },
      { key: 'secure', label: 'Use SSL/TLS (Port 465)', placeholder: 'false', default: false }
    ]
  }
};

export function EmailProviderSettings() {
  const [providers, setProviders] = useState<EmailProviderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testProvider, setTestProvider] = useState<EmailProviderRecord | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testSending, setTestSending] = useState(false);

  // Form State
  const [selectedType, setSelectedType] = useState<string>('brevo');
  const [name, setName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('Transfer Legacy');
  const [replyTo, setReplyTo] = useState('');
  const [dailyLimit, setDailyLimit] = useState(1000);
  const [isDefault, setIsDefault] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/settings/email-providers');
      setProviders(res.data);
    } catch (err: any) {
      console.error('Failed to load email providers', err);
      toast.error('Failed to load email providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleOpenAddModal = (type = 'brevo') => {
    setSelectedType(type);
    setName(`${PROVIDER_METADATA[type]?.name || type} Dispatcher`);
    setFromEmail(providers[0]?.from_email || 'outreach@transferlegacy.com');
    setFromName(providers[0]?.from_name || 'Transfer Legacy');
    setReplyTo('');
    setDailyLimit(1000);
    setIsDefault(providers.length === 0);
    
    // Set default credentials fields
    const initialCreds: Record<string, any> = {};
    PROVIDER_METADATA[type]?.fields.forEach((f) => {
      if (f.default !== undefined) initialCreds[f.key] = f.default;
    });
    setCredentials(initialCreds);
    setIsModalOpen(true);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromEmail || !fromName) {
      toast.error('From Email and From Name are required');
      return;
    }

    try {
      setSaving(true);
      await apiClient.post('/settings/email-providers', {
        provider_type: selectedType,
        name,
        from_email: fromEmail,
        from_name: fromName,
        reply_to: replyTo || undefined,
        credentials,
        daily_limit: Number(dailyLimit),
        is_default: isDefault,
      });

      toast.success(`${PROVIDER_METADATA[selectedType]?.name || selectedType} provider connected!`);
      setIsModalOpen(false);
      fetchProviders();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save email provider');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProvider = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await apiClient.delete(`/settings/email-providers/${id}`);
      toast.success('Email provider deleted');
      fetchProviders();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete provider');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await apiClient.post(`/settings/email-providers/${id}/set-default`);
      toast.success('Primary dispatch provider updated');
      fetchProviders();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to set default provider');
    }
  };

  const handleOpenTestModal = (provider: EmailProviderRecord) => {
    setTestProvider(provider);
    setTestEmailAddress(provider.from_email || '');
    setIsTestModalOpen(true);
  };

  const handleSendTestEmail = async () => {
    if (!testProvider || !testEmailAddress) {
      toast.error('Recipient email is required');
      return;
    }

    try {
      setTestSending(true);
      const res = await apiClient.post('/settings/email-providers/test', {
        provider_type: testProvider.provider_type,
        credentials: testProvider.credentials,
        from_email: testProvider.from_email,
        from_name: testProvider.from_name,
        test_to_email: testEmailAddress,
      });

      if (res.data.success) {
        toast.success(`Test email sent successfully via ${testProvider.provider_type.toUpperCase()}!`, {
          description: `Message ID: ${res.data.messageId || 'OK'}`
        });
        setIsTestModalOpen(false);
      } else {
        toast.error(`Test failed: ${res.data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to dispatch test email');
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-white">Email Dispatchers</h2>
            <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] font-black uppercase tracking-widest px-2 py-0.5">
              Multi-Provider Active
            </Badge>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Configure Brevo, Resend, SendGrid, Postmark, Mailgun, Mailjet, or your self-hosted Stalwart/SES SMTP servers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProviders}
            className="border-neutral-800 text-neutral-400 hover:text-white"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button
            variant="white"
            size="sm"
            className="gap-2 font-bold uppercase text-[11px] tracking-widest px-4 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            onClick={() => handleOpenAddModal('brevo')}
          >
            <Plus size={14} /> CONNECT PROVIDER
          </Button>
        </div>
      </div>

      {/* Quick Add Provider Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(PROVIDER_METADATA).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => handleOpenAddModal(key)}
            className="p-3.5 bg-[#111114] border border-[#27272a] hover:border-indigo-500/50 hover:bg-[#18181d] rounded-xl text-left transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 group-hover:text-white">
                {key}
              </span>
              <Plus size={12} className="text-neutral-600 group-hover:text-indigo-400 transition-colors" />
            </div>
            <div className="text-[11px] font-bold text-neutral-200 truncate">{meta.name}</div>
            <span className="text-[9px] text-neutral-500 mt-1">{meta.tag}</span>
          </button>
        ))}
      </div>

      {/* Configured Providers List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[#27272a] rounded-2xl bg-[#09090b]/50 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-[0_0_25px_rgba(99,102,241,0.15)]">
              <Server size={24} />
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">No Active Providers Connected</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-md">
              Connect your first mail service (Brevo, Resend, SendGrid, Postmark, Mailgun, or SMTP) to begin automated outreach campaigns.
            </p>
            <Button
              variant="white"
              size="sm"
              className="mt-6 gap-2 font-bold uppercase text-[11px] tracking-widest px-5"
              onClick={() => handleOpenAddModal('brevo')}
            >
              <Plus size={14} /> Connect Brevo Now
            </Button>
          </div>
        ) : (
          providers.map((p) => {
            const meta = PROVIDER_METADATA[p.provider_type] || PROVIDER_METADATA.smtp;
            return (
              <div
                key={p.id}
                className={`flex flex-col md:flex-row md:items-center justify-between p-5 bg-[#111114] border ${
                  p.is_default ? 'border-indigo-500/50 shadow-[0_0_25px_rgba(99,102,241,0.08)]' : 'border-[#27272a]'
                } rounded-xl group hover:border-[#3f3f46] transition-all gap-4`}
              >
                <div className="flex items-start md:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 flex items-center justify-center text-indigo-400 shrink-0 font-mono font-black text-sm uppercase">
                    {p.provider_type.substring(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-white text-base">{p.name}</h3>
                      <Badge className={meta.badgeColor + ' text-[9px] font-black uppercase tracking-wider px-2 py-0.5'}>
                        {meta.name}
                      </Badge>
                      {p.is_default && (
                        <Badge className="bg-indigo-500 text-white border-transparent text-[9px] font-black uppercase tracking-wider px-2 py-0.5 flex items-center gap-1 shadow-[0_0_10px_rgba(99,102,241,0.4)]">
                          <Star size={10} className="fill-white" /> PRIMARY DISPATCHER
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-neutral-500 flex-wrap">
                      <span>Sender: <strong className="text-neutral-300">{p.from_name}</strong> &lt;{p.from_email}&gt;</span>
                      <span>•</span>
                      <span>Daily Limit: <strong className="text-neutral-300">{p.daily_limit.toLocaleString()}</strong>/day</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs gap-1.5"
                    onClick={() => handleOpenTestModal(p)}
                  >
                    <Send size={13} /> Test Email
                  </Button>

                  {!p.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-neutral-800 text-neutral-400 hover:text-indigo-400 hover:border-indigo-500/30 text-xs"
                      onClick={() => handleSetDefault(p.id)}
                    >
                      Set Primary
                    </Button>
                  )}

                  <button
                    onClick={() => handleDeleteProvider(p.id, p.name)}
                    className="p-2 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Remove Provider"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Provider Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111114] border border-[#27272a] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Connect Email Dispatcher</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Configure API credentials and sender details.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-500 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProvider} className="space-y-4">
              {/* Provider Selection */}
              <div>
                <Label className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Mail Service Type</Label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setSelectedType(newType);
                    setName(`${PROVIDER_METADATA[newType]?.name || newType} Dispatcher`);
                    const initialCreds: Record<string, any> = {};
                    PROVIDER_METADATA[newType]?.fields.forEach((f) => {
                      if (f.default !== undefined) initialCreds[f.key] = f.default;
                    });
                    setCredentials(initialCreds);
                  }}
                  className="w-full mt-1.5 bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {Object.entries(PROVIDER_METADATA).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.name} ({meta.tag})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500 mt-1">
                  {PROVIDER_METADATA[selectedType]?.description}
                </p>
              </div>

              {/* Friendly Name */}
              <div>
                <Label className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Dispatcher Label</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Primary Brevo Outreach"
                  className="mt-1.5 bg-[#18181b] border-[#27272a] text-white"
                  required
                />
              </div>

              {/* Dynamic Credentials Inputs */}
              <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-xl space-y-3">
                <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-indigo-400" />
                  {PROVIDER_METADATA[selectedType]?.name} Credentials
                </div>

                {PROVIDER_METADATA[selectedType]?.fields.map((field) => (
                  <div key={field.key}>
                    <Label className="text-xs text-neutral-400">{field.label}</Label>
                    <Input
                      type={field.type || 'text'}
                      value={credentials[field.key] || ''}
                      onChange={(e) =>
                        setCredentials({ ...credentials, [field.key]: e.target.value })
                      }
                      placeholder={field.placeholder}
                      className="mt-1 bg-[#141417] border-[#27272a] text-white font-mono text-xs"
                      required={field.key !== 'region' && field.key !== 'secure'}
                    />
                  </div>
                ))}
              </div>

              {/* Sender Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-neutral-400">From Name</Label>
                  <Input
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Transfer Legacy"
                    className="mt-1 bg-[#18181b] border-[#27272a] text-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs text-neutral-400">From Email Address</Label>
                  <Input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="outreach@transferlegacy.com"
                    className="mt-1 bg-[#18181b] border-[#27272a] text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-neutral-400">Reply-To (Optional)</Label>
                  <Input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="replies@transferlegacy.com"
                    className="mt-1 bg-[#18181b] border-[#27272a] text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-neutral-400">Daily Limit</Label>
                  <Input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                    className="mt-1 bg-[#18181b] border-[#27272a] text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefaultCheckbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded bg-[#18181b] border-[#27272a] text-indigo-600 focus:ring-0"
                />
                <Label htmlFor="isDefaultCheckbox" className="text-xs text-neutral-300 cursor-pointer">
                  Set as default primary dispatcher for this workspace
                </Label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#27272a]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="border-neutral-800 text-neutral-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="white"
                  disabled={saving}
                  className="font-bold uppercase text-[11px] tracking-widest px-5"
                >
                  {saving ? 'Connecting...' : 'Save & Connect'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {isTestModalOpen && testProvider && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-[#27272a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2">
                <Send size={16} className="text-indigo-400" />
                <h3 className="text-base font-bold text-white uppercase tracking-tight">
                  Test {testProvider.provider_type.toUpperCase()} Dispatch
                </h3>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="text-neutral-500 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              A sample verification email will be dispatched through{' '}
              <strong className="text-white">{testProvider.name}</strong> to verify API keys and network connectivity.
            </p>

            <div>
              <Label className="text-xs text-neutral-400">Send Test Email To:</Label>
              <Input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="your.email@example.com"
                className="mt-1 bg-[#18181b] border-[#27272a] text-white"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsTestModalOpen(false)}
                className="border-neutral-800 text-neutral-400 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="white"
                onClick={handleSendTestEmail}
                disabled={testSending}
                className="font-bold uppercase text-[11px] tracking-widest gap-2"
              >
                {testSending ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> DISPATCHING...
                  </>
                ) : (
                  <>
                    <Send size={13} /> DISPATCH TEST
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
