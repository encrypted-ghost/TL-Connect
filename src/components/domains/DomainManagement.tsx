import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Badge } from '@/src/components/ui/badge';
import { Plus, Globe, ShieldCheck, Trash2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { db } from '@/src/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/src/lib/AuthContext';
import { toast } from 'sonner';

export function DomainManagement() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { profile } = useAuth();

  const fetchDomains = async () => {
    if (!profile?.workspaceId) return;
    try {
      const q = query(
        collection(db, 'domains'),
        where('workspaceId', '==', profile.workspaceId)
      );
      const snap = await getDocs(q);
      setDomains(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [profile?.workspaceId]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain || !profile?.workspaceId) return;
    
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'domains'), {
        domain: newDomain,
        isVerified: false,
        workspaceId: profile.workspaceId,
        createdAt: serverTimestamp()
      });
      setNewDomain('');
      toast.success('Domain added. DNS verification required.');
      fetchDomains();
    } catch (err) {
      toast.error('Failed to add domain');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this domain?')) return;
    try {
      await deleteDoc(doc(db, 'domains', id));
      toast.success('Domain removed');
      fetchDomains();
    } catch (err) {
      toast.error('Failed to remove domain');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Domain Management</h2>
          <p className="text-sm text-neutral-500">Connect and verify your outreach sending domains.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDomains} className="gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      <div className="bg-[#111114] border border-[#27272a] rounded-xl p-6">
        <form onSubmit={handleAddDomain} className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="domain">New Sending Domain</Label>
            <Input 
              id="domain" 
              placeholder="e.g. outreach.transferlegacy.com" 
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="bg-neutral-950 border-neutral-800"
            />
          </div>
          <Button type="submit" disabled={isAdding || !newDomain} className="bg-white text-black hover:bg-neutral-200 gap-2">
            <Plus size={16} /> Add Domain
          </Button>
        </form>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : domains.length > 0 ? (
        <div className="grid gap-4">
          {domains.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-4 bg-[#111114] border border-[#27272a] rounded-xl group hover:border-[#3f3f46] transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-400">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-100">{d.domain}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {d.isVerified ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                        <CheckCircle2 size={10} /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                        <AlertCircle size={10} /> Pending Verification
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {!d.isVerified && (
                  <Button variant="outline" size="sm" className="text-xs border-neutral-800 h-8">
                    View DNS Config
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-neutral-500 hover:text-red-400 h-8 w-8"
                  onClick={() => handleDelete(d.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-[#27272a] rounded-2xl bg-[#09090b]/50">
          <Globe size={48} className="text-neutral-700 mb-4" />
          <h3 className="text-sm font-bold text-neutral-400">No Domains Connected</h3>
          <p className="text-xs text-neutral-600 mt-1">Add a domain to start sending campaigns.</p>
        </div>
      )}

      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4 flex items-start gap-3">
        <ShieldCheck className="text-emerald-500 shrink-0 mt-0.5" size={18} />
        <div>
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Deliverability Best Practices</h4>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            We recommend using subdomains like <code className="text-indigo-400 italic">outreach.yourdomain.com</code> for cold outreach to protect your root domain's reputation. Always configure SPF, DKIM, and DMARC.
          </p>
        </div>
      </div>
    </div>
  );
}
