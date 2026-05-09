import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Badge } from '@/src/components/ui/badge';
import { Plus, UserPlus, Shield, User as UserIcon, Trash2, Mail } from 'lucide-react';
import { db } from '@/src/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/src/lib/AuthContext';
import { toast } from 'sonner';

export function TeamSettings() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const { profile } = useAuth();

  const fetchUsers = async () => {
    if (!profile?.workspaceId) return;
    try {
      const q = query(
        collection(db, 'users'),
        where('workspaceId', '==', profile.workspaceId)
      );
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [profile?.workspaceId]);

  if (profile?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Shield size={48} className="text-neutral-700 mb-4" />
        <h3 className="text-lg font-bold">Access Restricted</h3>
        <p className="text-neutral-500 text-sm max-w-xs">Only administrators can manage team members and permissions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Team Members</h2>
          <p className="text-sm text-neutral-500">Manage who has access to this workspace and their roles.</p>
        </div>
        <Button variant="white" size="sm" onClick={() => setIsInviteModalOpen(true)} className="gap-2">
          <UserPlus size={16} /> Add Member
        </Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-4 bg-[#111114] border border-[#27272a] rounded-xl group hover:border-[#3f3f46] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-indigo-400 font-bold uppercase">
                  {u.email[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-neutral-100">{u.name || u.email.split('@')[0]}</h3>
                    <Badge variant="outline" className="text-[10px] border-neutral-700 text-neutral-500">
                      {u.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <Mail size={10} /> {u.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select 
                  className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={u.role}
                  onChange={async (e) => {
                    try {
                      await updateDoc(doc(db, 'users', u.id), { role: e.target.value });
                      toast.success('Role updated');
                      fetchUsers();
                    } catch {
                      toast.error('Failed to update role');
                    }
                  }}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="AGENT">Agent</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-red-400">
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-4 flex items-start gap-4">
        <Shield className="text-indigo-500 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Role Based Access Control (RBAC)</h4>
          <ul className="text-[11px] text-neutral-500 mt-2 space-y-1.5 list-disc pl-4">
            <li><strong className="text-neutral-300">ADMIN:</strong> Full access to settings, domains, and team management.</li>
            <li><strong className="text-neutral-300">MANAGER:</strong> Can create campaigns and manage all leads.</li>
            <li><strong className="text-neutral-300">AGENT:</strong> Restricted to managing assigned leads and sending emails.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
