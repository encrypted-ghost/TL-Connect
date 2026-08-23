import React, { useState } from 'react';
import { Server, Users, Sliders, Shield } from 'lucide-react';
import { EmailProviderSettings } from './EmailProviderSettings';
import { TeamSettings } from './TeamSettings';
import { cn } from '@/src/lib/utils';

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<'email' | 'team'>('email');

  return (
    <div className="space-y-6">
      {/* Sub-nav Tabs */}
      <div className="flex items-center gap-2 border-b border-[#27272a] pb-4">
        <button
          onClick={() => setActiveTab('email')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
            activeTab === 'email'
              ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              : "bg-[#111114] text-neutral-400 hover:text-white hover:bg-[#18181b] border border-[#27272a]"
          )}
        >
          <Server size={14} />
          <span>Email Dispatchers & Providers</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
            activeTab === 'team'
              ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              : "bg-[#111114] text-neutral-400 hover:text-white hover:bg-[#18181b] border border-[#27272a]"
          )}
        >
          <Users size={14} />
          <span>Personnel & Access (RBAC)</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'email' && <EmailProviderSettings />}
        {activeTab === 'team' && <TeamSettings />}
      </div>
    </div>
  );
}
