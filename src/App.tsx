/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Send, 
  Mail, 
  Globe, 
  Zap, 
  Search, 
  Bell, 
  MoreHorizontal,
  Plus,
  Filter,
  Inbox,
  Layout,
  Settings,
  ChevronRight,
  ShieldCheck,
  Activity as ActivityIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { CommandMenu } from '@/src/components/ui/command-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { LeadForm } from '@/src/components/leads/LeadForm';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { cn } from '@/src/lib/utils';

type View = 'dashboard' | 'leads' | 'campaigns' | 'inbox' | 'domains' | 'automations';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const handleAction = (action: string) => {
    if (['dashboard', 'leads', 'campaigns', 'inbox', 'domains', 'automations'].includes(action)) {
      setCurrentView(action as View);
    } else {
      toast.info(`Action triggered: ${action}`);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#09090b] text-[#fafafa] font-sans overflow-hidden select-none">
      <Toaster theme="dark" position="bottom-right" expand={false} richColors />
      <CommandMenu onSelectAction={handleAction} />
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#27272a] flex flex-col bg-[#09090b]">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold tracking-tight text-lg">TL Connect</span>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold px-3 py-2">Operating System</div>
          <SidebarNavButton 
            icon={<LayoutDashboard size={16} />} 
            label="Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')} 
          />
          <SidebarNavButton 
            icon={<Users size={16} />} 
            label="Leads" 
            active={currentView === 'leads'} 
            onClick={() => setCurrentView('leads')} 
          />
          <SidebarNavButton 
            icon={<Send size={16} />} 
            label="Campaigns" 
            active={currentView === 'campaigns'} 
            onClick={() => setCurrentView('campaigns')} 
          />
          <SidebarNavButton 
            icon={<Mail size={16} />} 
            label="Unified Inbox" 
            active={currentView === 'inbox'} 
            onClick={() => setCurrentView('inbox')} 
          />

          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold px-3 py-6">Infrastructure</div>
          <SidebarNavButton 
            icon={<Globe size={16} />} 
            label="Domains & DNS" 
            active={currentView === 'domains'} 
            onClick={() => setCurrentView('domains')} 
          />
          <SidebarNavButton 
            icon={<Zap size={16} />} 
            label="Automations" 
            active={currentView === 'automations'} 
            onClick={() => setCurrentView('automations')} 
          />
        </nav>

        <div className="p-4 border-t border-[#27272a]">
          <div className="bg-[#18181b] p-3 rounded-lg border border-[#27272a]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-neutral-500 font-bold">REPUTATION</span>
              <span className="text-emerald-500 text-[10px] font-bold uppercase">Great</span>
            </div>
            <div className="w-full bg-[#27272a] h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[94%]" style={{ transition: 'width 1s ease-in-out' }}></div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs border border-neutral-700">JD</div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold">John Doe</span>
              <span className="text-[10px] text-neutral-500">Administrator</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-[#09090b] overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-[#27272a] px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-neutral-500">Transfer Legacy</span>
            <span className="text-neutral-700">/</span>
            <span className="text-neutral-200 font-medium capitalize">{currentView}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative flex items-center bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 w-64 group">
              <Search className="w-4 h-4 text-neutral-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="ml-2 bg-transparent border-none text-xs text-neutral-200 outline-none w-full placeholder:text-neutral-500"
              />
              <kbd className="text-[10px] bg-[#27272a] text-neutral-400 px-1.5 py-0.5 rounded border border-[#3f3f46] font-mono">⌘K</kbd>
            </div>
            <button className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center hover:bg-neutral-700 transition-colors cursor-pointer relative">
              <Bell className="w-4 h-4 text-neutral-400" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full border border-[#09090b]"></span>
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-neutral-800">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="h-full"
            >
              <ViewRenderer view={currentView} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- View Router ---

function ViewRenderer({ view }: { view: View }) {
  switch (view) {
    case 'dashboard': return <DashboardView />;
    case 'leads': return <LeadsView />;
    case 'campaigns': return <CampaignsView />;
    case 'inbox': return <InboxView />;
    case 'domains': return <DomainsView />;
    case 'automations': return <AutomationsView />;
    default: return <DashboardView />;
  }
}

// --- Views Implementation ---

function DashboardView() {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-neutral-500 text-sm mt-1">Real-time performance metrics across your workspace.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">Download Report</Button>
          <Button variant="white" size="sm">+ New Lead</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Active Campaigns" value="0" trend="No active campaigns" />
        <StatCard label="Leads Contacted" value="0" trend="0% month-over-month" />
        <StatCard label="Reply Rate" value="0.0%" trend="Not enough data" />
        <StatCard label="Domains" value="0" trend="Setup required" status="warning" />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <EmptyState 
            icon={<Send size={40} className="text-neutral-500" />}
            title="No Active Campaigns"
            description="Start reaching out to your leads with personalized email campaigns."
            action={<Button variant="white">Create First Campaign</Button>}
          />
        </div>
        <div className="col-span-4 bg-[#09090b] border border-[#27272a] rounded-xl p-6">
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

function LeadsView() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Leads</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <Filter size={14} /> Filter
          </Button>
          
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button variant="white" size="sm" className="gap-2">
                <Plus size={14} /> Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>
                  Enter the details of the lead you'd like to reach out to.
                </DialogDescription>
              </DialogHeader>
              <LeadForm 
                onSuccess={() => setIsAddModalOpen(false)} 
                onCancel={() => setIsAddModalOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <EmptyState 
        icon={<Users size={48} className="text-neutral-600" />}
        title="Your Lead Pipeline is Empty"
        description="Add leads manually or import a CSV file to begin your outreach process."
        action={
          <div className="flex gap-3">
            <Button variant="outline">Import CSV</Button>
            <Button onClick={() => setIsAddModalOpen(true)} variant="white">Add Lead Manually</Button>
          </div>
        }
      />
    </div>
  );
}

function CampaignsView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Campaigns</h2>
        <Button variant="white" size="sm" className="gap-2">
          <Plus size={14} /> Create Campaign
        </Button>
      </div>

      <EmptyState 
        icon={<Layout size={48} className="text-neutral-600" />}
        title="No Outreach Campaigns"
        description="Connect a domain and create a template to launch your first campaign."
        action={<Button variant="white">Get Started</Button>}
      />
    </div>
  );
}

function InboxView() {
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
      />
    </div>
  );
}

function DomainsView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Domain Management</h2>
        <Button variant="white" size="sm" className="gap-2">
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
        action={<Button variant="white">Connect First Domain</Button>}
      />
    </div>
  );
}

function AutomationsView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Automations</h2>
        <Button variant="white" size="sm" className="gap-2">
          <Plus size={14} /> New Rule
        </Button>
      </div>

      <EmptyState 
        icon={<Zap size={48} className="text-neutral-600" />}
        title="No Active Workflows"
        description="Set up automatic triggers to handle replies, bounces, or status changes."
        action={<Button variant="white">Configure Slack Webhook</Button>}
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

