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
import { TeamSettings } from '@/src/components/settings/TeamSettings';

type View = 'dashboard' | 'leads' | 'campaigns' | 'templates' | 'inbox' | 'domains' | 'automations' | 'settings';

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
    if (['dashboard', 'leads', 'campaigns', 'templates', 'inbox', 'domains', 'automations'].includes(action)) {
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
        <div className="px-6 py-8 md:py-10 flex flex-col items-start gap-4">
          <div className="flex items-center justify-between w-full md:hidden mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Menu</span>
            <button onClick={() => setMobileMenuOpen(false)} className="text-neutral-500 hover:text-white p-1">
              <X size={16} />
            </button>
          </div>
          <div className="relative group cursor-pointer" onClick={() => setCurrentView('dashboard')}>
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-60 transition duration-1000"></div>
            <div className="relative w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-colors overflow-hidden">
              <img src="/tl-connect-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="flex flex-col space-y-0.5">
            <span className="font-bold tracking-tight text-xl text-white">
              TL <span className="text-indigo-400">Connect</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-600 font-black">Enterprise CRM</span>
              <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
          </div>
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
          <div className="bg-[#111114] p-4 rounded-xl border border-[#27272a] shadow-inner">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] text-neutral-500 font-black uppercase tracking-widest">Workspace Rep</span>
              <span className="text-emerald-500 text-[10px] font-black">94.2%</span>
            </div>
            <div className="w-full bg-[#09090b] h-1.5 rounded-full overflow-hidden border border-neutral-900">
              <div className="bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 h-full w-[94%]" style={{ transition: 'width 2s ease-in-out' }}></div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 flex items-center justify-center text-xs font-black text-indigo-400 shadow-xl uppercase">
                {user.email?.[0] || 'U'}
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
    case 'inbox': return <InboxView onAction={onAction} />;
    case 'domains': return <DomainManagement />;
    case 'automations': return <AutomationsView onAction={onAction} />;
    case 'settings': return <TeamSettings />;
    default: return <DashboardView stats={stats} onAction={onAction} />;
  }
}

// --- Views Implementation ---

function DashboardView({ stats, onAction }: { stats: any, onAction: (action: string, payload?: any) => void }) {
  const leadsCount = stats?.leadsCount || 0;
  const campaignsCount = stats?.campaignsCount || 0;
  const replyRate = stats?.replyRate || 0;
  const totalSent = stats?.totalSent || 0;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-neutral-500 text-sm mt-1">Real-time performance metrics across your workspace.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => toast.success('Report generation started...')}>Download Report</Button>
          <Button variant="white" size="sm" className="flex-1 sm:flex-none" onClick={() => onAction('leads')}>+ New Lead</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Campaigns" value={campaignsCount.toString()} trend="Total campaigns in workspace" />
        <StatCard label="Leads Available" value={leadsCount.toLocaleString()} trend="Total CRM leads" />
        <StatCard label="Reply Rate" value={replyRate.toFixed(1) + "%"} trend={`${totalSent} total emails sent`} />
        <StatCard label="Domains" value="0" trend="Setup required" status="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <EmptyState 
            icon={<Send size={40} className="text-neutral-500" />}
            title="No Active Campaigns"
            description="Start reaching out to your leads with personalized email campaigns."
            action={<Button variant="white">Create First Campaign</Button>}
          />
        </div>
        <div className="lg:col-span-4 bg-[#09090b] border border-[#27272a] rounded-xl p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-6 flex items-center gap-2">
            <ActivityIcon size={14} /> Recent Activity
          </h3>
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <ActivityIcon size={24} className="text-neutral-700 mb-3" />
            <p className="text-xs text-neutral-500">Activity logs will appear here as your workspace grows.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadsView({ onImportCSV }: { onImportCSV?: () => void }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    try {
      const res = await apiClient.get('/leads');
      setLeads(res.data);
    } catch (err) {
      console.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Leads</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={fetchLeads}>
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
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
              <DialogHeader className="px-1">
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>
                  Enter the details of the lead you'd like to reach out to.
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

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : leads.length > 0 ? (
        <LeadsTable leads={leads} />
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
          <DialogContent className="sm:max-w-[500px] bg-neutral-950 border-neutral-800 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="px-1">
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
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
          onDelete={handleDelete}
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
  return (
    <div className="h-full flex flex-col">
       <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Unified Inbox</h2>
        <Badge variant="outline" className="font-mono">0 New</Badge>
      </div>
      
      <EmptyState 
        icon={<Inbox size={48} className="text-neutral-600" />}
        title="Inbox Zero"
        description="When leads reply to your campaigns, the conversations will appear here automatically."
        action={<Button variant="white" onClick={() => onAction('campaigns')}>Check Campaign Status</Button>}
      />
    </div>
  );
}

function DomainsView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Domain Management</h2>
        <Button variant="white" size="sm" className="gap-2" onClick={() => toast.info('Navigating to domain management...')}>
          <Plus size={14} /> Add Domain
        </Button>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 flex items-start gap-4">
        <ShieldCheck className="text-amber-500 shrink-0" size={20} />
        <div>
          <h4 className="text-sm font-semibold text-amber-200">Critical Domain Setup</h4>
          <p className="text-xs text-amber-500/80 mt-1">You must verify your domain DNS records (SPF, DKIM, DMARC) to ensure high email deliverability. Connect mail.transferlegacy.com to start.</p>
        </div>
      </div>

      <EmptyState 
        icon={<Globe size={48} className="text-neutral-600" />}
        title="No Domains Connected"
        description="Verify a domain to use it as a sender for your outreach campaigns."
        action={<Button variant="white" onClick={() => toast.info('Connect domain dialog coming soon...')}>Connect First Domain</Button>}
      />
    </div>
  );
}

function AutomationsView({ onAction }: { onAction: (action: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Automations</h2>
        <Button variant="white" size="sm" className="gap-2" onClick={() => toast.info('Automation rules editor coming soon...')}>
          <Plus size={14} /> New Rule
        </Button>
      </div>

      <EmptyState 
        icon={<Zap size={48} className="text-neutral-600" />}
        title="No Active Workflows"
        description="Set up automatic triggers to handle replies, bounces, or status changes."
        action={<Button variant="white" onClick={() => toast.info('Slack integration is coming soon...')}>Configure Slack Webhook</Button>}
      />
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

