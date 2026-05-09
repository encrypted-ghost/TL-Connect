import * as React from "react";
import { Command } from "cmdk";
import { Search, User, Send, Settings, Globe, Mail, Plus } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface CommandMenuProps {
  onSelectAction: (action: string) => void;
}

export function CommandMenu({ onSelectAction }: CommandMenuProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] w-[640px] max-w-[90vw] bg-[#09090b] border border-[#27272a] rounded-xl shadow-2xl p-0 overflow-hidden z-50 animate-in fade-in zoom-in duration-200"
    >
      <div className="flex items-center border-b border-[#27272a] px-3">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <Command.Input 
          placeholder="Type a command or search..." 
          className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      
      <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 scrollbar-thin scrollbar-thumb-[#27272a]">
        <Command.Empty className="py-6 text-center text-sm text-neutral-500">No results found.</Command.Empty>
        
        <Command.Group heading="Navigation" className="px-2 py-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
          <CommandItem onSelect={() => onSelectAction('dashboard')} icon={<Search className="mr-2 h-4 w-4" />} label="Go to Dashboard" shortcut="⌘D" />
          <CommandItem onSelect={() => onSelectAction('leads')} icon={<User className="mr-2 h-4 w-4" />} label="View Leads" shortcut="⌘L" />
          <CommandItem onSelect={() => onSelectAction('campaigns')} icon={<Send className="mr-2 h-4 w-4" />} label="View Campaigns" shortcut="⌘C" />
          <CommandItem onSelect={() => onSelectAction('domains')} icon={<Globe className="mr-2 h-4 w-4" />} label="Domain Settings" />
        </Command.Group>

        <Command.Separator className="h-[1px] bg-[#27272a] my-2" />

        <Command.Group heading="Actions" className="px-2 py-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
          <CommandItem onSelect={() => onSelectAction('create-lead')} icon={<Plus className="mr-2 h-4 w-4" />} label="Add New Lead" />
          <CommandItem onSelect={() => onSelectAction('create-campaign')} icon={<Plus className="mr-2 h-4 w-4" />} label="Create Campaign" />
          <CommandItem onSelect={() => onSelectAction('settings')} icon={<Settings className="mr-2 h-4 w-4" />} label="Workspace Settings" shortcut="⌘," />
        </Command.Group>
      </Command.List>

      <div className="bg-[#111114] border-t border-[#27272a] px-4 py-2 flex items-center justify-between">
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border border-neutral-700 bg-neutral-800 px-1.5 font-mono text-[10px] font-medium opacity-100 flex">
              <span className="text-xs">↑↓</span>
            </kbd>
            <span className="text-[10px] text-neutral-500 uppercase font-bold">Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border border-neutral-700 bg-neutral-800 px-1.5 font-mono text-[10px] font-medium opacity-100 flex">
              ↵
            </kbd>
            <span className="text-[10px] text-neutral-500 uppercase font-bold">Select</span>
          </div>
        </div>
        <div className="text-[10px] text-neutral-600 font-bold tracking-tight">TL CONNECT v1.0</div>
      </div>
    </Command.Dialog>
  );
}

function CommandItem({ icon, label, shortcut, onSelect }: { icon: React.ReactNode, label: string, shortcut?: string, onSelect: () => void }) {
  return (
    <Command.Item 
      onSelect={onSelect}
      className="flex cursor-default select-none items-center rounded-md px-2 py-2 text-sm outline-none aria-selected:bg-[#27272a] aria-selected:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors"
    >
      {icon}
      <span>{label}</span>
      {shortcut && <span className="ml-auto text-[10px] text-neutral-500 font-mono tracking-widest">{shortcut}</span>}
    </Command.Item>
  );
}
