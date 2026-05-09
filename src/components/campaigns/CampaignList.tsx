import { Play, Calendar, MoreVertical, Trash2, Clock } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/src/components/ui/dropdown-menu';

interface Campaign {
  id: string;
  name: string;
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'PAUSED';
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
  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <div 
          key={campaign.id} 
          className="group flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${
              campaign.status === 'RUNNING' ? 'bg-indigo-500/10 text-indigo-400' : 
              campaign.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' :
              'bg-neutral-800 text-neutral-400'
            }`}>
              <Play size={20} className={campaign.status === 'RUNNING' ? 'animate-pulse' : ''} />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-neutral-100">{campaign.name}</h3>
                <Badge variant="outline" className={`text-[10px] ${
                  campaign.status === 'RUNNING' ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5' : 
                  campaign.status === 'COMPLETED' ? 'border-green-500/30 text-green-400 bg-green-500/5' :
                  'border-neutral-700 text-neutral-500'
                }`}>
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
      ))}
    </div>
  );
}
