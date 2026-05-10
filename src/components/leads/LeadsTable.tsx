import React from 'react';
import { DataTable } from '../ui/data-table';
import { Badge } from '../ui/badge';
import { MoreHorizontal, User, Trash2, Edit } from 'lucide-react';
import { Button } from '../ui/button';
import { timeAgo } from '@/src/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';

interface LeadsTableProps {
  leads: any[];
  onDelete?: (id: string) => void;
  onAddLead?: () => void;
}

export function LeadsTable({ leads, onDelete, onAddLead }: LeadsTableProps) {
  const columns = [
    {
      header: 'Name',
      accessorKey: 'firstName',
      cell: (lead: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-black text-white uppercase shadow-sm border border-indigo-400/20">
            {lead.firstName?.[0]}{lead.lastName?.[0]}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-neutral-100">{lead.firstName} {lead.lastName}</span>
            <span className="text-[10px] text-neutral-500 font-mono">{lead.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Company',
      accessorKey: 'company',
      cell: (lead: any) => (
        <span className="text-neutral-400">{lead.company?.name || '-'}</span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (lead: any) => (
        <Badge 
          variant={
            lead.status === 'INTERESTED' ? 'emerald' : 
            lead.status === 'REPLIED' ? 'blue' : 
            lead.status === 'NEW' ? 'secondary' : 'outline'
          }
          className="uppercase text-[9px] tracking-widest px-2"
        >
          {lead.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      header: 'Tags',
      accessorKey: 'tags',
      cell: (lead: any) => (
        <div className="flex gap-1 flex-wrap">
          {lead.tags.map((tag: any) => (
            <span 
              key={tag.id} 
              className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-700"
            >
              {tag.name}
            </span>
          ))}
          {lead.tags.length === 0 && <span className="text-[10px] text-neutral-600 italic">No tags</span>}
        </div>
      ),
    },
    {
      header: 'Owner',
      accessorKey: 'owner',
      cell: (lead: any) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 flex items-center justify-center text-[8px] text-neutral-400 shadow-inner">
            {lead.owner?.name?.[0] || <User size={10} />}
          </div>
          <span className="text-xs text-neutral-400">{lead.owner?.name || 'Unassigned'}</span>
        </div>
      ),
    },
    {
      header: 'Created',
      accessorKey: 'createdAt',
      cell: (lead: any) => (
        <span className="text-[10px] text-neutral-500 font-mono">{timeAgo(lead.createdAt)}</span>
      ),
    },
    {
      header: '',
      accessorKey: 'actions',
      className: 'text-right',
      cell: (lead: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-white">
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800">
            <DropdownMenuItem 
              onClick={() => onDelete?.(lead.id)}
              className="flex items-center gap-2 cursor-pointer text-red-400 focus:bg-red-950 focus:text-red-300"
            >
              <Trash2 size={14} /> Delete Lead
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DataTable 
      columns={columns as any} 
      data={leads} 
      emptyState={
         <div className="flex flex-col items-center justify-center h-[400px] border border-dashed border-[#27272a] rounded-2xl bg-[#09090b]/50">
          <div className="p-5 rounded-full bg-[#111114] border border-[#27272a] mb-5">
            <User size={40} className="text-neutral-600" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-neutral-200">No Leads Found</h3>
          <p className="text-sm text-neutral-500 mt-2 max-w-xs text-center leading-relaxed">
            There are no leads matching your search criteria.
          </p>
          <div className="mt-8">
            <Button variant="white" onClick={onAddLead}>Add Your First Lead</Button>
          </div>
        </div>
      }
    />
  );
}
