import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Badge } from '@/src/components/ui/badge';
import { UserPlus, Shield, Mail, Trash2, ShieldAlert } from 'lucide-react';
import { apiClient } from '@/src/lib/apiClient';
import { useAuth } from '@/src/lib/AuthContext';
import { toast } from 'sonner';

export function TeamSettings() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/users');
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load team roster');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    try {
      await apiClient.delete(`/users/${id}`);
      toast.success('User removed from team');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove user');
    }
  };

  const handleAuthorizeUser = () => {
    toast.info('Personnel Authorization', {
      description: "Personnel management is strictly controlled via the Identity Provider. Please use the Supabase dashboard to invite new team members.",
      duration: 5000
    });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (profile?.role !== 'ADMIN' && profile?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <ShieldAlert size={40} className="text-red-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white uppercase tracking-tight">Security Restriction</h3>
          <p className="text-neutral-500 text-sm max-w-sm mx-auto">Access to the personnel database and RBAC protocols is restricted to Administrative entities.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Personnel Database</h2>
          <p className="text-sm text-neutral-500">Secure management of authorized system users and privilege levels.</p>
        </div>
        <Button 
          variant="white" 
          size="sm" 
          className="gap-2 font-bold uppercase text-[11px] tracking-widest px-4"
          onClick={handleAuthorizeUser}
        >
          <UserPlus size={14} /> AUTHORIZE USER
        </Button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-5 bg-[#111114] border border-[#27272a] rounded-xl group hover:border-[#3f3f46] transition-all">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 border border-indigo-400/30 flex items-center justify-center text-white font-black text-xl uppercase shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  {u.email[0]}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-neutral-100">{u.name || 'UNNAMED_ENTITY'}</h3>
                    <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 text-[10px] font-black uppercase tracking-widest px-2 py-0">
                      {u.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-neutral-500 flex items-center gap-1.5 font-medium uppercase tracking-tight">
                      <Mail size={12} className="text-neutral-700" /> {u.email}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-neutral-800"></span>
                    <span className="text-[11px] text-neutral-600 font-mono">ID: {u.id.substring(0, 8)}...</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-neutral-600 hover:text-red-400 hover:bg-red-500/10"
                  onClick={() => handleDeleteUser(u.id)}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="bg-neutral-950/40 border border-neutral-900 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Shield size={100} className="text-indigo-400" />
          </div>
          <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
            Access Matrix
          </h4>
          <ul className="space-y-3 text-[11px] text-neutral-500">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold w-12">ADMIN:</span>
              <span>Full cryptographic access to system settings, domains, and personnel protocols.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neutral-300 font-bold w-12">AGENT:</span>
              <span>Restricted to lead outreach and campaign execution modules.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
