import React, { useState, useMemo } from 'react';
import { Play, Calendar, MoreVertical, Trash2, Clock, Filter, CheckCircle2, AlertCircle, Send, FileText } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { cn } from '@/src/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/src/components/ui/dropdown-menu';

interface Campaign {
  id: string;
  name: string;
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'FAILED';
  scheduledAt: string | null;
  createdAt: string;
  statsSent: number;
  statsReplied: number;
}

interface CampaignListProps {
  campaigns: Campaign[];
  onStart: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CampaignList({ campaigns, onStart, onDelete }: CampaignListProps) {
  const [filterStatus, setFilterStatus] = useState<string | 'ALL'>('ALL');

  const filteredCampaigns = useMemo(() => {
    if (filterStatus === 'ALL') return campaigns;
    return campaigns.filter(c => c.status === filterStatus);
  }, [campaigns, filterStatus]);

  const stats = [
    { label: 'All', value: 'ALL', icon: <Filter size={14} /> },
    { label: 'Draft', value: 'DRAFT', icon: <FileText size={14} /> },
    { label: 'Running', value: 'RUNNING', icon: <Send size={14} /> },
    { label: 'Completed', value: 'COMPLETED', icon: <CheckCircle2 size={14} /> },
    { label: 'Failed', value: 'FAILED', icon: <AlertCircle size={14} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-1 bg-neutral-950 border border-neutral-800 rounded-lg w-fit">
        {stats.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilterStatus(s.value)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold tracking-tight transition-all uppercase",
              filterStatus === s.value 
                ? "bg-neutral-800 text-white shadow-sm" 
                : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900"
            )}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((campaign) => (
            <div 
              key={campaign.id} 
              className="group flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-lg",
                  campaign.status === 'RUNNING' ? 'bg-indigo-500/10 text-indigo-400' : 
                  campaign.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' :
                  campaign.status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                  'bg-neutral-800 text-neutral-400'
                )}>
                  {campaign.status === 'RUNNING' ? <Send size={20} className="animate-pulse" /> : 
                   campaign.status === 'COMPLETED' ? <CheckCircle2 size={20} /> :
                   campaign.status === 'FAILED' ? <AlertCircle size={20} /> :
                   <FileText size={20} />}
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-neutral-100">{campaign.name}</h3>
                    <Badge variant="outline" className={cn(
                      "text-[10px]",
                      campaign.status === 'RUNNING' ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5' : 
                      campaign.status === 'COMPLETED' ? 'border-green-500/30 text-green-400 bg-green-500/5' :
                      campaign.status === 'FAILED' ? 'border-red-500/30 text-red-400 bg-red-500/5' :
                      'border-neutral-700 text-neutral-500'
                    )}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {campaign.scheduledAt ? (
                      <div className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-400/5 px-2 py-0.5 rounded border border-amber-400/20">
                        <Clock size={12} />
                        Scheduled: {new Date(campaign.scheduledAt).toLocaleString()}
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-500">
                        Created {new Date(campaign.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-8 text-center hidden md:flex">
                  <div>
                    <p className="text-xs text-neutral-500 mb-0.5">Sent</p>
                    <p className="text-sm font-medium text-neutral-200">{campaign.statsSent}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-0.5">Replies</p>
                    <p className="text-sm font-medium text-neutral-200">{campaign.statsReplied}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {campaign.status === 'DRAFT' && !campaign.scheduledAt && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 gap-2 text-xs border-neutral-800 hover:bg-neutral-800"
                      onClick={() => onStart(campaign.id)}
                    >
                      <Play size={12} /> Start
                    </Button>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-white">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800">
                      <DropdownMenuItem 
                        onClick={() => onDelete(campaign.id)}
                        className="flex items-center gap-2 cursor-pointer text-red-400 focus:bg-red-950 focus:text-red-300"
                      >
                        <Trash2 size={14} /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-32 flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-xl bg-neutral-900/50">
            <Filter size={24} className="text-neutral-700 mb-2" />
            <p className="text-xs text-neutral-500 uppercase tracking-widest font-bold">No {filterStatus.toLowerCase()} campaigns found</p>
          </div>
        )}
      </div>
    </div>
  );
}
