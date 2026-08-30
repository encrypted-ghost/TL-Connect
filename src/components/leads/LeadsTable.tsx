import React, { useState } from 'react';
import { DataTable } from '../ui/data-table';
import { Badge } from '../ui/badge';
import { MoreHorizontal, User, Trash2, Send, Mail, Building, Briefcase } from 'lucide-react';
import { Button } from '../ui/button';
import { timeAgo } from '@/src/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { DirectEmailModal } from './DirectEmailModal';

interface LeadsTableProps {
  leads: any[];
  onDelete?: (id: string) => void;
  onAddLead?: () => void;
  onRefresh?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Outbound': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  'Inbound': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'Cold Outreach': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'Enterprise': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'SMB': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'VIP': 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  'Partner': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
};

export function LeadsTable({ leads, onDelete, onAddLead, onRefresh }: LeadsTableProps) {
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<any | null>(null);

  const columns = [
    {
      header: 'Prospect',
      accessorKey: 'first_name',
      cell: (lead: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-black text-white uppercase shadow-sm border border-indigo-400/20 shrink-0">
            {lead.first_name?.[0] || <User size={12} />}
            {lead.last_name?.[0]}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-neutral-100 truncate">{lead.first_name} {lead.last_name}</span>
            <span className="text-[10px] text-neutral-500 font-mono truncate">{lead.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Company & Title',
      accessorKey: 'company_name',
      cell: (lead: any) => {
        const comp = lead.company_name || lead.company?.name;
        return (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-neutral-200">{comp || '-'}</span>
            {lead.title && <span className="text-[10px] text-neutral-500">{lead.title}</span>}
          </div>
        );
      },
    },
    {
      header: 'Category',
      accessorKey: 'category',
      cell: (lead: any) => {
        const cat = lead.category || 'Outbound';
        const colorClass = CATEGORY_COLORS[cat] || 'bg-neutral-800 text-neutral-400 border-neutral-700';
        return (
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${colorClass}`}>
            {cat}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (lead: any) => (
        <Badge 
          variant={
            lead.status === 'INTERESTED' ? 'emerald' : 
            lead.status === 'REPLIED' ? 'blue' : 
            lead.status === 'CONTACTED' ? 'purple' :
            lead.status === 'QUALIFIED' ? 'emerald' :
            lead.status === 'NEW' ? 'secondary' : 'outline'
          }
          className="uppercase text-[9px] tracking-widest px-2"
        >
          {lead.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      header: 'Created',
      accessorKey: 'created_at',
      cell: (lead: any) => (
        <span className="text-[10px] text-neutral-500 font-mono">{timeAgo(lead.created_at)}</span>
      ),
    },
    {
      header: '',
      accessorKey: 'actions',
      className: 'text-right',
      cell: (lead: any) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedLeadForEmail(lead)}
            className="h-7 px-2 text-xs text-indigo-400 hover:text-white hover:bg-indigo-600/20 gap-1.5"
            title="Send direct email"
          >
            <Send size={12} />
            <span className="hidden sm:inline">Send Mail</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-500 hover:text-white">
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 text-xs">
              <DropdownMenuItem 
                onClick={() => setSelectedLeadForEmail(lead)}
                className="flex items-center gap-2 cursor-pointer text-indigo-300 focus:bg-indigo-950"
              >
                <Mail size={12} /> Dispatch Direct Email
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-800" />
              <DropdownMenuItem 
                onClick={() => onDelete?.(lead.id)}
                className="flex items-center gap-2 cursor-pointer text-red-400 focus:bg-red-950 focus:text-red-300"
              >
                <Trash2 size={12} /> Delete Lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <>
      <DirectEmailModal
        lead={selectedLeadForEmail}
        isOpen={!!selectedLeadForEmail}
        onOpenChange={(open) => {
          if (!open) setSelectedLeadForEmail(null);
        }}
        onSuccess={() => {
          onRefresh?.();
        }}
      />

      <DataTable 
        columns={columns as any} 
        data={leads} 
        emptyState={
           <div className="flex flex-col items-center justify-center h-[350px] border border-dashed border-[#27272a] rounded-2xl bg-[#09090b]/50">
            <div className="p-5 rounded-full bg-[#111114] border border-[#27272a] mb-5">
              <User size={40} className="text-neutral-600" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-neutral-200">No Leads Found</h3>
            <p className="text-sm text-neutral-500 mt-2 max-w-xs text-center leading-relaxed">
              Add individual prospects or upload CSV to begin sending targeted outreach.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="white" onClick={onAddLead}>Add Your First Lead</Button>
            </div>
          </div>
        }
      />
    </>
  );
}
