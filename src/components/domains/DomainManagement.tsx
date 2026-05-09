import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Globe, ShieldCheck, Trash2, CheckCircle2, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { apiClient } from '@/src/lib/apiClient';
import { useAuth } from '@/src/lib/AuthContext';
import { toast } from 'sonner';

export function DomainManagement() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { profile } = useAuth();

  const fetchDomains = async () => {
    try {
      const res = await apiClient.get('/domains');
      setDomains(res.data);
    } catch (err) {
      toast.error('Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;
    
    setIsAdding(true);
    try {
      await apiClient.post('/domains', {
        domain: newDomain,
        isVerified: false
      });
      setNewDomain('');
      toast.success('Domain added to infrastructure.');
      fetchDomains();
    } catch (err) {
      toast.error('Failed to add domain');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Domain Infrastructure</h2>
          <p className="text-sm text-neutral-500">Authorized sending domains for outreach campaigns.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDomains} className="gap-2 border-neutral-800">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Status
        </Button>
      </div>

      <div className="bg-[#111114] border border-[#27272a] rounded-xl p-6 shadow-xl">
        <form onSubmit={handleAddDomain} className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="domain" className="text-xs uppercase tracking-widest text-neutral-500 font-bold">New Sending Domain</Label>
            <Input 
              id="domain" 
              placeholder="e.g. outreach.transferlegacy.com" 
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="bg-neutral-950 border-neutral-800 h-11"
            />
          </div>
          <Button type="submit" disabled={isAdding || !newDomain} className="bg-white text-black hover:bg-neutral-200 h-11 px-6 gap-2 font-bold">
            <Plus size={16} /> REGISTER
          </Button>
        </form>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : domains.length > 0 ? (
        <div className="grid gap-4">
          {domains.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-4 bg-[#111114] border border-[#27272a] rounded-xl group hover:border-indigo-500/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-indigo-400 group-hover:bg-indigo-500/10 transition-colors">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-100">{d.domain}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {d.isVerified ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                        <CheckCircle2 size={10} /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                        <AlertCircle size={10} /> Pending DNS
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {!d.isVerified && (
                  <Button variant="outline" size="sm" className="text-[10px] uppercase font-bold tracking-wider border-neutral-800 h-8">
                    View DNS Config
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-neutral-500 hover:text-red-400 h-8 w-8 hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-[#27272a] rounded-2xl bg-neutral-950/20">
          <Globe size={48} className="text-neutral-800 mb-4" />
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest">No Infrastructure found</h3>
          <p className="text-xs text-neutral-600 mt-1">Register a domain to begin outreach operations.</p>
        </div>
      )}

      <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-5 flex items-start gap-4">
        <div className="p-2 bg-indigo-500/10 rounded-lg">
          <ShieldCheck className="text-indigo-500" size={20} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] mb-2">Security Note</h4>
          <p className="text-[11px] text-neutral-500 leading-relaxed max-w-2xl">
            To maintain high deliverability and protect the main brand identity, all outreach should be conducted via dedicated subdomains. Ensure SPF, DKIM, and DMARC records are correctly propagated before starting high-volume campaigns.
          </p>
        </div>
      </div>
    </div>
  );
}
