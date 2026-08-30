/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '@/src/lib/AuthContext';
import { Login } from '@/src/components/auth/Login';
import { LogOut, LayoutDashboard, Users, Send, Mail, Globe, Zap, Search, Bell, MoreHorizontal, Plus, Filter, Inbox, Layout, Settings, ChevronRight, ShieldCheck, Activity as ActivityIcon, FileText, Trash2, CheckCircle, AlertCircle, Menu, X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { CommandMenu } from '@/src/components/ui/command-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { LeadForm } from '@/src/components/leads/LeadForm';
import { LeadsTable } from '@/src/components/leads/LeadsTable';
import { CSVImportDialog } from '@/src/components/leads/CSVImportDialog';
import { TemplateList } from '@/src/components/templates/TemplateList';
import { TemplateForm } from '@/src/components/templates/TemplateForm';
import { CampaignList } from '@/src/components/campaigns/CampaignList';
import { CampaignForm } from '@/src/components/campaigns/CampaignForm';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { cn } from '@/src/lib/utils';
import { apiClient } from '@/src/lib/apiClient';

import { useEffect } from 'react';

import { DomainManagement } from '@/src/components/domains/DomainManagement';
import { SettingsView } from '@/src/components/settings/SettingsView';
import { EmailLogsView } from '@/src/components/logs/EmailLogsView';

type View = 'dashboard' | 'leads' | 'campaigns' | 'templates' | 'logs' | 'inbox' | 'domains' | 'automations' | 'settings';

export default function App() {
  const { user, profile, loading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/analytics/overview');
        setStats(res.data);
      } catch (error: any) {
        console.error('Fetch stats error:', error.response?.data || error.message);
      }
    };
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-white text-[10px] uppercase tracking-[0.4em] font-black animate-pulse">Initializing System</p>
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-indigo-500/40"></div>
              <div className="w-1 h-1 rounded-full bg-indigo-500/60"></div>
              <div className="w-1 h-1 rounded-full bg-indigo-500/40"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleAction = (action: string, payload?: any) => {
    // Basic navigation
    if (['dashboard', 'leads', 'campaigns', 'templates', 'logs', 'inbox', 'domains', 'automations', 'settings'].includes(action)) {
      setCurrentView(action as View);
      setMobileMenuOpen(false);
      
      if (payload) {
        toast.success(`Navigating to ${payload.name || payload.firstName || action}`);
      }
    } else if (action === 'create-lead') {
      setCurrentView('leads');
      toast.info("Add a lead from the Leads view");
    } else if (action === 'create-campaign') {
      setCurrentView('campaigns');
      toast.info("Create a campaign from the Campaigns view");
    } else if (action === 'create-template') {
      setCurrentView('templates');
      toast.info("Create a template from the Templates view");
    } else {
      toast.info(`Action triggered: ${action}`);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#09090b] text-[#fafafa] font-sans overflow-hidden select-none">
      <CommandMenu onSelectAction={handleAction} />
      <CSVImportDialog 
        isOpen={isImportModalOpen} 
        onOpenChange={setIsImportModalOpen}
        onSuccess={() => {
          setRefreshCounter(prev => prev + 1);
          setCurrentView('leads');
          toast.success('Leads list updated');
        }}
      />

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 transform bg-[#09090b] border-r border-[#27272a] flex flex-col transition-transform duration-300 md:relative md:translate-x-0 h-full",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-5 py-4 md:py-5 flex items-center justify-between border-b border-[#1c1c20]">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentView('dashboard')}>
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-indigo-500/30 bg-neutral-900 flex items-center justify-center">
              <img src="/tl-connect-logo.png" alt="Logo" className="w-full h-full object-contain p-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-sm text-white flex items-center gap-1.5">
                TL <span className="text-indigo-400">Connect</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              </span>
              <span className="text-[8px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Enterprise CRM</span>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="text-neutral-500 hover:text-white p-1 md:hidden">
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-none">
          <div className="text-[9px] uppercase tracking-[0.3em] text-neutral-500 font-black px-4 py-3 mb-1 opacity-50">Operations</div>
          <SidebarNavButton 
            icon={<LayoutDashboard size={16} />} 
            label="Command Center" 
            active={currentView === 'dashboard'} 
            onClick={() => handleAction('dashboard')} 
          />
          <SidebarNavButton 
            icon={<Users size={16} />} 
            label="Lead Matrix" 
            active={currentView === 'leads'} 
            onClick={() => handleAction('leads')} 
          />
          <SidebarNavButton 
            icon={<Send size={16} />} 
            label="Outreach" 
            active={currentView === 'campaigns'} 
            onClick={() => handleAction('campaigns')} 
          />
          <SidebarNavButton 
            icon={<FileText size={16} />} 
            label="Blueprints" 
            active={currentView === 'templates'} 
            onClick={() => handleAction('templates')} 
          />
          <SidebarNavButton 
            icon={<ActivityIcon size={16} />} 
            label="Dispatch Logs" 
            active={currentView === 'logs'} 
            onClick={() => handleAction('logs')} 
          />
          <SidebarNavButton 
            icon={<Mail size={16} />} 
            label="Signal Inbox" 
            active={currentView === 'inbox'} 
            onClick={() => handleAction('inbox')} 
          />

          <div className="text-[9px] uppercase tracking-[0.3em] text-neutral-500 font-black px-4 py-8 mb-1 opacity-50">Infrastructure</div>
          <SidebarNavButton 
            icon={<Globe size={16} />} 
            label="DNS & Nodes" 
            active={currentView === 'domains'} 
            onClick={() => handleAction('domains')} 
          />
          <SidebarNavButton 
            icon={<Zap size={16} />} 
            label="Automations" 
            active={currentView === 'automations'} 
            onClick={() => handleAction('automations')} 
          />
          <div className="h-4"></div>
          <SidebarNavButton 
            icon={<Settings size={16} />} 
            label="System Config" 
            active={currentView === 'settings'} 
            onClick={() => handleAction('settings')} 
          />
        </nav>

        <div className="p-4 border-t border-[#27272a] bg-neutral-950/50">
          <div className="bg-[#111114] p-3.5 rounded-xl border border-[#27272a] shadow-inner space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Delivery Health
              </span>
              <span className="text-emerald-400 text-xs font-bold font-mono">
                {stats?.deliveryRate !== undefined ? `${stats.deliveryRate}%` : '100%'}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#1e1e24] text-center">
              <div>
                <div className="text-[8px] uppercase text-neutral-500 font-bold">Sent</div>
                <div className="text-[11px] font-bold text-white font-mono">{stats?.totalSent || 0}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase text-neutral-500 font-bold">Opens</div>
                <div className="text-[11px] font-bold text-blue-400 font-mono">{stats?.totalOpened || 0}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase text-neutral-500 font-bold">Failed</div>
                <div className="text-[11px] font-bold text-red-400 font-mono">{(stats?.totalFailed || 0) + (stats?.totalBounced || 0)}</div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-white shadow-[0_0_15px_rgba(99,102,241,0.2)] uppercase">
                {user.email?.[0] || 'U'}
                {user.email?.[1] && !user.email?.[1].includes('@') ? user.email?.[1] : ''}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-white truncate uppercase tracking-tight">{user.email?.split('@')[0] || 'User'}</span>
                <div className="flex items-center gap-1.5">
                  <Badge className="h-3.5 bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[8px] font-black uppercase tracking-tighter px-1">
                    {profile?.role || 'VIEWER'}
                  </Badge>
                </div>
              </div>
            </div>
            <button 
              onClick={() => logout()}
              className="group text-neutral-600 hover:text-red-400 p-2 transition-all rounded-xl hover:bg-red-500/10 active:scale-90"
              title="Terminate Session"
            >
              <LogOut size={16} className="group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-[#09090b] overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-[#27272a] px-4 md:px-8 flex items-center justify-between shrink-0 bg-[#09090b]/80 backdrop-blur-md z-10 w-full">
          <div className="flex items-center gap-3 md:gap-5 text-sm min-w-0">
            <button 
              className="md:hidden p-1.5 -ml-1 text-neutral-400 hover:text-white rounded-md hover:bg-white/5 active:bg-white/10"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <img src="/tl-connect-logo.png" alt="Logo" className="w-5 h-5 object-contain" />
              <span className="hidden sm:inline text-neutral-400 font-bold uppercase tracking-widest text-[10px]">T.L. Connect</span>
            </div>
            <span className="hidden sm:inline text-neutral-800 font-black">|</span>
            <span className="text-white font-black uppercase tracking-widest text-[10px] truncate">{currentView}</span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="hidden sm:flex relative items-center bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 w-48 md:w-64 group">
              <Search className="w-4 h-4 text-neutral-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="ml-2 bg-transparent border-none text-xs text-neutral-200 outline-none w-full placeholder:text-neutral-500"
              />
              <kbd className="text-[10px] bg-[#27272a] text-neutral-400 px-1.5 py-0.5 rounded border border-[#3f3f46] font-mono">⌘K</kbd>
            </div>
            <button 
              onClick={() => toast.info('No new notifications')}
              className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center hover:bg-neutral-700 transition-colors cursor-pointer relative"
            >
              <Bell className="w-4 h-4 text-neutral-400" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full border border-[#09090b]"></span>
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-neutral-800">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="h-full"
            >
              <ViewRenderer 
                key={`${currentView}-${refreshCounter}`}
                view={currentView} 
                stats={stats} 
                onAction={handleAction} 
                onImportCSV={() => setIsImportModalOpen(true)}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- View Router ---
interface ViewRendererProps {
  key?: string;
  view: View;
  stats: any;
  onAction: (action: string, payload?: any) => void;
  onImportCSV: () => void;
}

function ViewRenderer({ view, stats, onAction, onImportCSV }: ViewRendererProps) {
  switch (view) {
    case 'dashboard': return <DashboardView stats={stats} onAction={onAction} />;
    case 'leads': return <LeadsView onImportCSV={onImportCSV} />;
    case 'campaigns': return <CampaignsView />;
    case 'templates': return <TemplatesView />;
    case 'logs': return <EmailLogsView />;
    case 'inbox': return <InboxView onAction={onAction} />;
    case 'domains': return <DomainManagement />;
    case 'automations': return <AutomationsView onAction={onAction} />;
    case 'settings': return <SettingsView />;
    default: return <DashboardView stats={stats} onAction={onAction} />;
  }
}

// --- Views Implementation ---

function DashboardView({ stats, onAction }: { stats: any, onAction: (action: string, payload?: any) => void }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const leadsCount = stats?.leadsCount || 0;
  const campaignsCount = stats?.campaignsCount || 0;
  const totalSent = stats?.totalSent || 0;
  const totalOpened = stats?.totalOpened || 0;
  const totalReplied = stats?.totalReplied || 0;
  const totalFailed = (stats?.totalFailed || 0) + (stats?.totalBounced || 0);
  const openRate = stats?.openRate || 0;
  const replyRate = stats?.replyRate || 0;
  const bounceRate = stats?.bounceRate || 0;
  const deliveryRate = stats?.deliveryRate ?? 100;

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await apiClient.get('/activity');
        setActivities(res.data || []);
      } catch (err) {
        console.error('Failed to fetch activity');
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <LayoutDashboard className="text-indigo-400" size={28} />
            Command Center
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Live telemetry, outreach transmission rates, and engagement funnel.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onAction('logs')}>
            <ActivityIcon size={14} className="mr-1.5" /> Dispatch Logs
          </Button>
          <Button variant="white" size="sm" onClick={() => onAction('campaigns')}>
            <Send size={14} className="mr-1.5" /> New Outreach
          </Button>
        </div>
      </div>

      {/* 4 Core Performance Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#111114] border border-[#27272a] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Total Dispatched</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Send size={14} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-mono">{totalSent.toLocaleString()}</div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <span>{deliveryRate}% Delivery Rate</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#111114] border border-[#27272a] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Opens & Reads</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <CheckCircle size={14} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-mono">{totalOpened.toLocaleString()}</div>
            <div className="text-[11px] text-blue-400 mt-1 flex items-center gap-1 font-medium">
              <span>{openRate}% Open Rate</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#111114] border border-[#27272a] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Replies & Signals</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Mail size={14} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-mono">{totalReplied.toLocaleString()}</div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <span>{replyRate}% Signal Rate</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#111114] border border-[#27272a] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Bounces & Failures</span>
            <span className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertCircle size={14} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-mono">{totalFailed.toLocaleString()}</div>
            <div className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-medium">
              <span>{bounceRate}% Bounce Rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Funnel & Live Activity Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Conversion Funnel & Pipeline Overview */}
        <div className="lg:col-span-7 bg-[#111114] border border-[#27272a] rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-300 flex items-center gap-2">
              <Zap size={14} className="text-indigo-400" /> Outreach Conversion Funnel
            </h3>
            <span className="text-[11px] text-neutral-500 font-mono">{leadsCount} total CRM prospects</span>
          </div>

          <div className="space-y-4 pt-2">
            {/* Step 1: Total Leads */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-neutral-300">1. Total Prospect Matrix</span>
                <span className="font-mono text-neutral-400">{leadsCount} Leads</span>
              </div>
              <div className="w-full bg-[#18181b] h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full w-full"></div>
              </div>
            </div>

            {/* Step 2: Dispatched */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-neutral-300">2. Dispatched & Delivered</span>
                <span className="font-mono text-emerald-400">{totalSent} Sent</span>
              </div>
              <div className="w-full bg-[#18181b] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${leadsCount > 0 ? Math.min(100, (totalSent / leadsCount) * 100) : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Step 3: Opens */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-neutral-300">3. Opened & Engaged</span>
                <span className="font-mono text-blue-400">{totalOpened} Opens ({openRate}%)</span>
              </div>
              <div className="w-full bg-[#18181b] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${totalSent > 0 ? Math.min(100, (totalOpened / totalSent) * 100) : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Step 4: Replies */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-neutral-300">4. Responded / Interested</span>
                <span className="font-mono text-purple-400">{totalReplied} Replies ({replyRate}%)</span>
              </div>
              <div className="w-full bg-[#18181b] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${totalSent > 0 ? Math.min(100, (totalReplied / totalSent) * 100) : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Live Transmission & Activity Stream */}
        <div className="lg:col-span-5 bg-[#111114] border border-[#27272a] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-300 flex items-center gap-2">
                <ActivityIcon size={14} className="text-indigo-400" /> Real-Time Activity
              </h3>
              <button onClick={() => onAction('logs')} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold">
                View All
              </button>
            </div>
            
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 scrollbar-none">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : activities.length > 0 ? (
                activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex gap-2.5 text-xs p-2 rounded-lg bg-[#18181b]/60 border border-[#27272a]/60">
                    <div className="shrink-0 w-6 h-6 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-[10px] mt-0.5">
                      <ActivityIcon size={12} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-neutral-200 leading-tight truncate">{act.description}</p>
                      <p className="text-neutral-500 mt-1 text-[10px] font-mono">{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <ActivityIcon size={24} className="text-neutral-700 mb-2" />
                  <p className="text-xs text-neutral-500">Activity logs will stream live as campaigns dispatch.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#1e1e24] mt-4 flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">Manage Campaigns:</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onAction('campaigns')}>
              View All Campaigns ({campaignsCount})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadsView({ onImportCSV }: { onImportCSV?: () => void }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/leads');
      setLeads(res.data || []);
    } catch (err) {
      console.error('Failed to fetch leads');
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await apiClient.delete(`/leads/${id}`);
      toast.success('Lead deleted');
      fetchLeads();
    } catch (err) {
      toast.error('Failed to delete lead');
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const categories = ['ALL', 'Outbound', 'Inbound', 'Cold Outreach', 'Enterprise', 'SMB', 'VIP', 'Partner'];
  const filteredLeads = selectedCategory === 'ALL' 
    ? leads 
    : leads.filter(l => (l.category || 'Outbound') === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Lead Matrix</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Prospect database with category classification, company intelligence, and direct messaging.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={fetchLeads} disabled={loading}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={onImportCSV}>
            <Upload size={14} /> Import CSV
          </Button>
          
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button variant="white" size="sm" className="gap-2">
                <Plus size={14} /> Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto bg-[#09090b] border-[#27272a] text-white">
              <DialogHeader className="px-1">
                <DialogTitle>Add New Prospect</DialogTitle>
                <DialogDescription className="text-xs text-neutral-400">
                  Enter prospect contact, company name, and audience category.
                </DialogDescription>
              </DialogHeader>
              <LeadForm 
                onSuccess={() => {
                  setIsAddModalOpen(false);
                  fetchLeads();
                }} 
                onCancel={() => setIsAddModalOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => {
          const count = cat === 'ALL' ? leads.length : leads.filter(l => (l.category || 'Outbound') === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                  : 'bg-[#111114] text-neutral-400 hover:text-white border border-[#27272a]'
              }`}
            >
              <span>{cat === 'ALL' ? 'All Leads' : cat}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-[#1e1e24] text-neutral-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : filteredLeads.length > 0 ? (
        <LeadsTable 
          leads={filteredLeads} 
          onDelete={handleDeleteLead} 
          onAddLead={() => setIsAddModalOpen(true)} 
          onRefresh={fetchLeads}
        />
      ) : leads.length > 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border border-dashed border-[#27272a] rounded-2xl bg-[#09090b]/50 text-center px-4">
          <Users size={32} className="text-neutral-600 mb-2" />
          <h3 className="text-sm font-bold text-neutral-300">No leads in "{selectedCategory}"</h3>
          <p className="text-xs text-neutral-500 mt-1">Select another category or add a new lead with this category.</p>
        </div>
      ) : (
        <EmptyState 
          icon={<Users size={48} className="text-neutral-600" />}
          title="Your Lead Pipeline is Empty"
          description="Add leads manually or import a CSV file to begin your outreach process."
          action={
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={onImportCSV}>Import CSV</Button>
              <Button onClick={() => setIsAddModalOpen(true)} variant="white">Add Lead Manually</Button>
            </div>
          }
        />
      )}
    </div>
  );
}

function CampaignsView() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCampaigns = async () => {
    try {
      const res = await apiClient.get('/campaigns');
      setCampaigns(res.data);
    } catch (err) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleSubmit = async (data: any) => {
    try {
      await apiClient.post('/campaigns', data);
      toast.success(data.scheduledAt ? 'Campaign scheduled successfully' : 'Campaign created');
      setIsModalOpen(false);
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to create campaign');
    }
  };

  const handleStart = async (id: string) => {
    try {
      await apiClient.post(`/campaigns/${id}/start`);
      toast.success('Campaign started');
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to start campaign');
    }
  };

  const handleStop = async (id: string) => {
    try {
      await apiClient.post(`/campaigns/${id}/stop`);
      toast.success('Campaign paused');
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to pause campaign');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await apiClient.delete(`/campaigns/${id}`);
      toast.success('Campaign deleted');
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to delete campaign');
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await apiClient.patch(`/campaigns/${id}`, data);
      toast.success('Campaign updated successfully');
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to update campaign');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campaigns</h2>
          <p className="text-sm text-neutral-500">Launch and monitor your automated outreach.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button variant="white" size="sm" className="gap-2">
              <Plus size={14} /> Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] bg-[#09090b] border-[#27272a] text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader className="px-1">
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Define your outreach campaign and choose when to start.
              </DialogDescription>
            </DialogHeader>
            <CampaignForm 
              onSubmit={handleSubmit}
              onCancel={() => setIsModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : campaigns.length > 0 ? (
        <CampaignList 
          campaigns={campaigns} 
          onStart={handleStart}
          onStop={handleStop}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      ) : (
        <EmptyState 
          icon={<Layout size={48} className="text-neutral-600" />}
          title="No Outreach Campaigns"
          description="Connect a domain and create a template to launch your first campaign."
          action={<Button variant="white" onClick={() => setIsModalOpen(true)}>Create First Campaign</Button>}
        />
      )}
    </div>
  );
}

function TemplatesView() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const fetchTemplates = async () => {
    try {
      const res = await apiClient.get('/templates');
      setTemplates(res.data);
    } catch (err) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSeed = async () => {
    try {
      setLoading(true);
      await apiClient.post('/templates/seed');
      await fetchTemplates();
      toast.success('Default templates seeded');
    } catch (err) {
      toast.error('Failed to seed templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingTemplate) {
        await apiClient.patch(`/templates/${editingTemplate.id}`, data);
        toast.success('Template updated');
      } else {
        await apiClient.post('/templates', data);
        toast.success('Template created');
      }
      setIsModalOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await apiClient.delete(`/templates/${id}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicate = async (template: any) => {
    try {
      const { id, created_at, updated_at, ...rest } = template;
      const duplicatedData = {
        ...rest,
        name: `${template.name} (Copy)`
      };
      await apiClient.post('/templates', duplicatedData);
      toast.success('Template duplicated');
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to duplicate template');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Content Templates</h2>
          <p className="text-sm text-neutral-500">Manage your email sequences and one-off messaging.</p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeed}>
              Seed References
            </Button>
          )}
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) setEditingTemplate(null);
          }}>
            <DialogTrigger asChild>
              <Button variant="white" size="sm" className="gap-2">
                <Plus size={14} /> New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] bg-neutral-950 border-neutral-800 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="px-1">
                <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
                <DialogDescription>
                  Draft your messaging using HTML or plain text with dynamic variables.
                </DialogDescription>
              </DialogHeader>
              <TemplateForm 
                initialData={editingTemplate}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setIsModalOpen(false);
                  setEditingTemplate(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : templates.length > 0 ? (
        <TemplateList 
          templates={templates} 
          onEdit={(t) => {
            setEditingTemplate(t);
            setIsModalOpen(true);
          }}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      ) : (
        <EmptyState 
          icon={<FileText size={48} className="text-neutral-600" />}
          title="No Messaging Templates"
          description="Create recurring messaging blocks to use in your campaigns."
          action={<Button variant="white" onClick={() => setIsModalOpen(true)}>Create First Template</Button>}
        />
      )}
    </div>
  );
}

function InboxView({ onAction }: { onAction: (action: string) => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const res = await apiClient.get('/inbox');
        setMessages(res.data);
      } catch (err) {
        console.error('Failed to fetch inbox');
      } finally {
        setLoading(false);
      }
    };
    fetchInbox();
  }, []);

  return (
    <div className="h-full flex flex-col">
       <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Unified Inbox</h2>
        <Badge variant="outline" className="font-mono">{messages.length} New</Badge>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : messages.length > 0 ? (
        <div className="grid gap-3">
          {messages.map((msg) => (
            <div key={msg.id} className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-all cursor-pointer">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold uppercase shadow-inner">
                    {msg.leads?.first_name?.[0] || 'L'}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{msg.leads?.first_name} {msg.leads?.last_name}</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">{msg.leads?.email}</p>
                  </div>
                </div>
                <span className="text-[10px] text-neutral-600 uppercase font-bold tracking-tighter">
                  {new Date(msg.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-neutral-300 mt-3 line-clamp-2 leading-relaxed">
                {msg.description}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState 
          icon={<Inbox size={48} className="text-neutral-600" />}
          title="Inbox Zero"
          description="When leads reply to your campaigns, the conversations will appear here automatically."
          action={<Button variant="white" onClick={() => onAction('campaigns')}>Check Campaign Status</Button>}
        />
      )}
    </div>
  );
}

function AutomationsView({ onAction }: { onAction: (action: string) => void }) {
  const [rules, setRules] = useState([
    { id: '1', name: 'Auto-reply to leads', description: 'Send a follow-up immediately when a lead replies with interest.', active: true, type: 'trigger' },
    { id: '2', name: 'Slack Notifications', description: 'Forward high-intent signals to the #sales-alerts channel.', active: false, type: 'integration' },
    { id: '3', name: 'Drip Sequence', description: 'Move non-responsive leads to a long-term nurture campaign after 14 days.', active: true, type: 'workflow' }
  ]);

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
    toast.success('Automation rule updated');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Automations</h2>
          <p className="text-sm text-neutral-500">Intelligent triggers to handle lead lifecycle events.</p>
        </div>
        <Button variant="white" size="sm" className="gap-2" onClick={() => toast.info('Automation rules editor coming soon...')}>
          <Plus size={14} /> New Rule
        </Button>
      </div>

      <div className="grid gap-4 mt-8">
        {rules.map(rule => (
          <div key={rule.id} className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between group hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center border",
                rule.active ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-neutral-800 border-neutral-700 text-neutral-500"
              )}>
                <Zap size={20} className={rule.active ? "animate-pulse" : ""} />
              </div>
              <div>
                <h4 className="font-semibold text-white">{rule.name}</h4>
                <p className="text-xs text-neutral-500 mt-1">{rule.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-[9px] uppercase tracking-widest bg-neutral-950 border-neutral-800 text-neutral-600">
                {rule.type}
              </Badge>
              <button 
                onClick={() => toggleRule(rule.id)}
                className={cn(
                  "w-10 h-5 rounded-full transition-colors relative flex items-center px-1",
                  rule.active ? "bg-indigo-600" : "bg-neutral-800"
                )}
              >
                <div className={cn(
                  "w-3 h-3 rounded-full bg-white transition-transform",
                  rule.active ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-8 border border-dashed border-neutral-800 rounded-2xl flex flex-col items-center text-center">
        <div className="p-4 bg-indigo-500/5 rounded-full mb-4">
          <Globe className="text-indigo-400/50" size={32} />
        </div>
        <h4 className="text-sm font-bold text-white uppercase tracking-[0.2em]">External Integrations</h4>
        <p className="text-xs text-neutral-500 mt-2 max-w-sm">Connect your workspace to thousands of other apps via our native Zapier and Make integrations.</p>
        <Button variant="outline" className="mt-6 border-neutral-800 text-xs" onClick={() => toast.info('API documentation coming soon...')}>
          View Connector API
        </Button>
      </div>
    </div>
  );
}

// --- Shared Components ---

function SidebarNavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all duration-200",
        active 
          ? "bg-[#27272a] text-white font-medium shadow-sm" 
          : "text-neutral-400 hover:text-neutral-200 hover:bg-[#18181b]"
      )}
    >
      {icon}
      <span>{label}</span>
      {active && <motion.div layoutId="sidebar-active" className="ml-auto w-1 h-3 rounded-full bg-indigo-500" />}
    </button>
  );
}

function StatCard({ label, value, trend, status }: { label: string, value: string, trend: string, status?: 'default' | 'warning' | 'success' }) {
  return (
    <div className="bg-transparent border border-[#27272a] p-5 rounded-xl hover:bg-[#111114] transition-all group">
      <div className="text-neutral-500 text-xs font-semibold tracking-tight uppercase mb-1">{label}</div>
      <div className="text-3xl font-bold font-mono tracking-tighter text-neutral-100">{value}</div>
      <div className={cn(
        "text-[10px] mt-2 font-medium",
        status === 'warning' ? 'text-amber-500' : status === 'success' ? 'text-emerald-500' : 'text-neutral-500'
      )}>
        {trend}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode, title: string, description: string, action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-[400px] border border-dashed border-[#27272a] rounded-2xl bg-[#09090b]/50 group transition-all hover:bg-[#09090b]">
      <div className="p-5 rounded-full bg-[#111114] border border-[#27272a] mb-5 group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <h3 className="text-lg font-bold tracking-tight text-neutral-200">{title}</h3>
      <p className="text-sm text-neutral-500 mt-2 max-w-xs text-center leading-relaxed">{description}</p>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}

