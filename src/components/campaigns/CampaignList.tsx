import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Calendar, 
  MoreVertical, 
  Trash2, 
  Clock, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  FileText, 
  Square, 
  Edit3, 
  Server, 
  Sparkles,
  Eye,
  MousePointerClick,
  MessageSquareReply,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { cn, timeAgo } from '@/src/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/src/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/src/components/ui/dialog';
import { CampaignForm } from './CampaignForm';

interface CampaignListProps {
  campaigns: any[];
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, data: any) => void;
}

export function CampaignList({ campaigns, onStart, onStop, onDelete, onUpdate }: CampaignListProps) {
  const [filterStatus, setFilterStatus] = useState<string | 'ALL'>('ALL');
  const [selectedCampaignForEdit, setSelectedCampaignForEdit] = useState<any | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const filteredCampaigns = useMemo(() => {
    if (filterStatus === 'ALL') return campaigns;
    return campaigns.filter(c => c.status === filterStatus);
  }, [campaigns, filterStatus]);

  const stats = [
    { label: 'All', value: 'ALL', icon: <Filter size={14} /> },
    { label: 'Draft', value: 'DRAFT', icon: <FileText size={14} /> },
    { label: 'Running', value: 'RUNNING', icon: <Send size={14} /> },
    { label: 'Paused', value: 'PAUSED', icon: <Square size={14} /> },
    { label: 'Completed', value: 'COMPLETED', icon: <CheckCircle2 size={14} /> },
    { label: 'Failed', value: 'FAILED', icon: <AlertCircle size={14} /> },
  ];

  const handleEditSubmit = async (data: any) => {
    if (!selectedCampaignForEdit || !onUpdate) return;
    setIsSubmittingEdit(true);
    try {
      await onUpdate(selectedCampaignForEdit.id, data);
      setSelectedCampaignForEdit(null);
    } catch (err) {
      console.error('Failed to update campaign:', err);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter status tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-lg w-fit overflow-x-auto">
        {stats.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilterStatus(s.value)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold tracking-tight transition-all uppercase whitespace-nowrap",
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

      {/* Edit Campaign Modal */}
      <Dialog open={!!selectedCampaignForEdit} onOpenChange={(open) => { if (!open) setSelectedCampaignForEdit(null); }}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto bg-[#09090b] border-[#27272a] text-white">
          <DialogHeader className="px-1">
            <DialogTitle>Edit Outreach Campaign</DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Update campaign configuration, audience segmentation, or email template.
            </DialogDescription>
          </DialogHeader>
          {selectedCampaignForEdit && (
            <CampaignForm 
              initialData={selectedCampaignForEdit}
              onSubmit={handleEditSubmit}
              onCancel={() => setSelectedCampaignForEdit(null)}
              isSubmitting={isSubmittingEdit}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((campaign) => {
            const rawDate = campaign.created_at || campaign.createdAt;
            const sent = campaign.stats_sent || campaign.statsSent || 0;
            const opened = campaign.stats_opened || campaign.statsOpened || 0;
            const clicked = campaign.stats_clicked || campaign.statsClicked || 0;
            const replied = campaign.stats_replied || campaign.statsReplied || 0;
            const bounced = campaign.stats_bounced || campaign.statsBounced || 0;
            const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : '0.0';
            const replyRate = sent > 0 ? ((replied / sent) * 100).toFixed(1) : '0.0';

            const templateName = campaign.template?.name || 'Standard Blueprint';
            const targetCategory = campaign.target_category || 'All Categories';
            const targetStatus = campaign.target_status || 'All Statuses';

            return (
              <div 
                key={campaign.id} 
                className="group flex flex-col lg:flex-row lg:items-center justify-between p-4 bg-[#111114] border border-[#27272a] rounded-xl hover:border-neutral-700 transition-all gap-4 shadow-sm"
              >
                {/* Left: Info & Metadata */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={cn(
                    "p-2.5 rounded-lg shrink-0 mt-0.5",
                    campaign.status === 'RUNNING' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' : 
                    campaign.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                    campaign.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                    campaign.status === 'PAUSED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                    'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  )}>
                    {campaign.status === 'RUNNING' ? <Send size={18} className="animate-pulse" /> : 
                     campaign.status === 'COMPLETED' ? <CheckCircle2 size={18} /> :
                     campaign.status === 'FAILED' ? <AlertCircle size={18} /> :
                     campaign.status === 'PAUSED' ? <Square size={18} /> :
                     <FileText size={18} />}
                  </div>
                  
                  <div className="flex flex-col min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-neutral-100 text-base">{campaign.name}</h3>
                      <Badge variant="outline" className={cn(
                        "text-[9px] uppercase font-bold tracking-wider px-2",
                        campaign.status === 'RUNNING' ? 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10' : 
                        campaign.status === 'COMPLETED' ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' :
                        campaign.status === 'FAILED' ? 'border-red-500/40 text-red-400 bg-red-500/10' :
                        campaign.status === 'PAUSED' ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' :
                        'border-neutral-700 text-neutral-400'
                      )}>
                        {campaign.status}
                      </Badge>
                    </div>

                    {/* Metadata Badges: Template, Audience, Target */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-neutral-400">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                        <FileText size={11} className="text-indigo-400" /> {templateName}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                        <Filter size={11} className="text-emerald-400" /> {targetCategory === 'ALL' ? 'All Leads' : targetCategory}
                      </span>
                      {targetStatus !== 'ALL' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                          Status: {targetStatus}
                        </span>
                      )}
                      <span className="text-[10px] text-neutral-500">
                        {rawDate ? `Created ${timeAgo(rawDate)}` : 'Created recently'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center / Right: Rich Metrics & Actions */}
                <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t border-[#1e1e24] lg:border-t-0">
                  {/* Detailed Performance Metrics */}
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="px-2">
                      <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Sent</p>
                      <p className="text-sm font-bold text-neutral-200 mt-0.5">{sent}</p>
                    </div>
                    <div className="px-2">
                      <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Opens</p>
                      <p className="text-sm font-bold text-blue-400 mt-0.5">{opened} <span className="text-[9px] text-neutral-500 font-normal">({openRate}%)</span></p>
                    </div>
                    <div className="px-2">
                      <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Clicks</p>
                      <p className="text-sm font-bold text-purple-400 mt-0.5">{clicked}</p>
                    </div>
                    <div className="px-2">
                      <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Replies</p>
                      <p className="text-sm font-bold text-emerald-400 mt-0.5">{replied} <span className="text-[9px] text-neutral-500 font-normal">({replyRate}%)</span></p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Direct Edit Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 gap-1.5 text-xs border-neutral-800 hover:bg-neutral-800 text-neutral-300"
                      onClick={() => setSelectedCampaignForEdit(campaign)}
                      title="Edit Campaign"
                    >
                      <Edit3 size={12} />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>

                    {(campaign.status === 'DRAFT' || campaign.status === 'PAUSED') && (
                      <Button 
                        size="sm" 
                        variant="white" 
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => onStart(campaign.id)}
                      >
                        <Play size={12} /> {campaign.status === 'PAUSED' ? 'Resume' : 'Start'}
                      </Button>
                    )}

                    {campaign.status === 'RUNNING' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 gap-1.5 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        onClick={() => onStop(campaign.id)}
                      >
                        <Square size={12} /> Pause
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-white">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 text-xs">
                        <DropdownMenuItem 
                          onClick={() => setSelectedCampaignForEdit(campaign)}
                          className="flex items-center gap-2 cursor-pointer text-neutral-200 focus:bg-neutral-800"
                        >
                          <Edit3 size={14} /> Edit Campaign
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-neutral-800" />
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
            );
          })
        ) : (
          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-xl bg-neutral-900/30">
            <Filter size={24} className="text-neutral-700 mb-2" />
            <p className="text-xs text-neutral-500 uppercase tracking-widest font-bold">No {filterStatus.toLowerCase()} campaigns found</p>
          </div>
        )}
      </div>
    </div>
  );
}
