import React, { useState, useEffect } from 'react';
import { apiClient } from '@/src/lib/apiClient';
import { 
  Mail, 
  Send, 
  Eye, 
  MousePointerClick, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  Filter,
  Clock,
  Building,
  Server,
  User
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { timeAgo } from '@/src/lib/utils';

export function EmailLogsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/logs/emails?limit=200');
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch email logs:', err);
      toast.error('Failed to load email activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesStatus = filterStatus === 'ALL' || log.type === filterStatus;
    const search = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      log.description?.toLowerCase().includes(search) ||
      log.metadata?.toEmail?.toLowerCase().includes(search) ||
      log.metadata?.subject?.toLowerCase().includes(search) ||
      log.lead?.email?.toLowerCase().includes(search) ||
      log.lead?.first_name?.toLowerCase().includes(search) ||
      log.lead?.company_name?.toLowerCase().includes(search);

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (type: string) => {
    switch (type) {
      case 'EMAIL_SENT':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"><CheckCircle2 size={10} /> Delivered</span>;
      case 'EMAIL_OPENED':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30"><Eye size={10} /> Opened</span>;
      case 'EMAIL_CLICKED':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30"><MousePointerClick size={10} /> Clicked</span>;
      case 'EMAIL_BOUNCED':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30"><AlertTriangle size={10} /> Bounced</span>;
      case 'EMAIL_FAILED':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30"><XCircle size={10} /> Failed</span>;
      case 'EMAIL_SUPPRESSED':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30"><AlertTriangle size={10} /> Suppressed</span>;
      case 'EMAIL_UNSUBSCRIBED':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-500/10 text-neutral-400 border border-neutral-500/30">Unsubscribed</span>;
      case 'REPLY':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">Replied</span>;
      default:
        return <span className="text-[10px] uppercase text-neutral-400 px-2 py-0.5 rounded bg-neutral-800">{type}</span>;
    }
  };

  const sentCount = logs.filter(l => l.type === 'EMAIL_SENT').length;
  const openedCount = logs.filter(l => l.type === 'EMAIL_OPENED').length;
  const clickedCount = logs.filter(l => l.type === 'EMAIL_CLICKED').length;
  const bouncedCount = logs.filter(l => l.type === 'EMAIL_BOUNCED' || l.type === 'EMAIL_FAILED').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Send className="text-indigo-400" size={28} />
            Transmission & Dispatch Logs
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Real-time audit log of every email transaction, webhook telemetry, and delivery status.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchLogs} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Logs</span>
        </Button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#111114] border border-[#27272a] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">Total Dispatched</div>
            <div className="text-xl font-bold text-white mt-0.5">{sentCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 size={16} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111114] border border-[#27272a] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">Total Opens</div>
            <div className="text-xl font-bold text-white mt-0.5">{openedCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <Eye size={16} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111114] border border-[#27272a] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">Link Clicks</div>
            <div className="text-xl font-bold text-white mt-0.5">{clickedCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <MousePointerClick size={16} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111114] border border-[#27272a] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">Bounces & Failures</div>
            <div className="text-xl font-bold text-white mt-0.5">{bouncedCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle size={16} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { label: 'All Logs', value: 'ALL' },
            { label: 'Delivered', value: 'EMAIL_SENT' },
            { label: 'Opened', value: 'EMAIL_OPENED' },
            { label: 'Clicked', value: 'EMAIL_CLICKED' },
            { label: 'Bounced', value: 'EMAIL_BOUNCED' },
            { label: 'Failed', value: 'EMAIL_FAILED' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === f.value
                  ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                  : 'bg-[#111114] text-neutral-400 hover:text-white border border-[#27272a]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search email, company, subject..."
            className="w-full bg-[#111114] border border-[#27272a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#27272a] bg-[#09090b] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-neutral-500 mt-4 uppercase tracking-widest font-black">Loading Transmission Logs</span>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111114] border-b border-[#27272a] text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Subject / Context</th>
                  <th className="py-3 px-4">Dispatcher</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1c20]">
                {filteredLogs.map((log) => {
                  const leadName = log.lead ? `${log.lead.first_name || ''} ${log.lead.last_name || ''}`.trim() : '';
                  const leadEmail = log.lead?.email || log.metadata?.toEmail || log.metadata?.email || 'Unknown';
                  const companyName = log.lead?.company_name;
                  const provider = log.metadata?.provider || log.metadata?.providerType || 'SMTP';
                  const subject = log.metadata?.subject || log.description;

                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Recipient */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300 uppercase shrink-0">
                            {leadName?.[0] || leadEmail?.[0] || 'E'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-neutral-100 truncate">{leadName || leadEmail}</span>
                            <span className="text-[10px] text-neutral-500 font-mono truncate">{leadEmail}</span>
                            {companyName && (
                              <span className="text-[9px] text-neutral-400 flex items-center gap-1 mt-0.5">
                                <Building size={10} /> {companyName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Subject / Description */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col max-w-sm">
                          <span className="text-neutral-200 font-medium truncate">{subject}</span>
                          {log.metadata?.messageId && (
                            <span className="text-[9px] text-neutral-500 font-mono truncate">ID: {log.metadata.messageId}</span>
                          )}
                          {log.metadata?.error && (
                            <span className="text-[9px] text-red-400 font-mono mt-0.5">{log.metadata.error}</span>
                          )}
                        </div>
                      </td>

                      {/* Dispatcher Provider */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 uppercase">
                          <Server size={10} className="text-indigo-400" />
                          {provider}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(log.type)}
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-neutral-300 font-mono text-[11px]">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-[9px] text-neutral-500">{timeAgo(log.created_at)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Mail size={36} className="text-neutral-700 mb-3" />
            <h3 className="text-sm font-bold text-neutral-300">No Email Dispatch Logs</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs">
              Dispatched campaigns and direct emails will automatically produce real-time delivery logs here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
