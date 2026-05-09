import * as React from "react";
import { Command } from "cmdk";
import { Search, User, Send, Settings, Globe, Mail, Plus, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { apiClient } from "@/src/lib/apiClient";

interface CommandMenuProps {
  onSelectAction: (action: string, payload?: any) => void;
}

export function CommandMenu({ onSelectAction }: CommandMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<{
    leads: any[];
    campaigns: any[];
    templates: any[];
  }>({ leads: [], campaigns: [], templates: [] });
  const [loading, setLoading] = React.useState(false);

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

  React.useEffect(() => {
    if (!search || search.length < 2) {
      setResults({ leads: [], campaigns: [], templates: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/search?q=${encodeURIComponent(search)}`);
        setResults(res.data);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

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
          value={search}
          onValueChange={setSearch}
          placeholder="Type a command or search..." 
          className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      
      <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2 scrollbar-thin scrollbar-thumb-[#27272a]">
        {loading && search.length >= 2 && (
          <div className="py-6 text-center text-xs text-neutral-500 animate-pulse uppercase tracking-widest font-bold">Searching...</div>
        )}
        
        <Command.Empty className="py-6 text-center text-sm text-neutral-500">No results found.</Command.Empty>
        
        {/* Search Results */}
        {results.leads.length > 0 && (
          <Command.Group heading="Leads" className="px-2 py-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
            {results.leads.map((lead) => (
              <CommandItem 
                key={lead.id} 
                onSelect={() => {
                  onSelectAction('leads', lead);
                  setOpen(false);
                  setSearch("");
                }} 
                icon={<User className="mr-2 h-4 w-4 text-indigo-400" />} 
                label={`${lead.firstName} ${lead.lastName} (${lead.email})`} 
              />
            ))}
          </Command.Group>
        )}

        {results.campaigns.length > 0 && (
          <Command.Group heading="Campaigns" className="px-2 py-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
            {results.campaigns.map((campaign) => (
              <CommandItem 
                key={campaign.id} 
                onSelect={() => {
                  onSelectAction('campaigns', campaign);
                  setOpen(false);
                  setSearch("");
                }} 
                icon={<Send className="mr-2 h-4 w-4 text-purple-400" />} 
                label={campaign.name} 
              />
            ))}
          </Command.Group>
        )}

        {results.templates.length > 0 && (
          <Command.Group heading="Templates" className="px-2 py-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
            {results.templates.map((template) => (
              <CommandItem 
                key={template.id} 
                onSelect={() => {
                  onSelectAction('templates', template);
                  setOpen(false);
                  setSearch("");
                }} 
                icon={<FileText className="mr-2 h-4 w-4 text-amber-400" />} 
                label={template.name} 
              />
            ))}
          </Command.Group>
        )}

        {(results.leads.length > 0 || results.campaigns.length > 0 || results.templates.length > 0) && (
          <Command.Separator className="h-[1px] bg-[#27272a] my-2" />
        )}

        <Command.Group heading="Navigation" className="px-2 py-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
          <CommandItem onSelect={() => { onSelectAction('dashboard'); setOpen(false); }} icon={<Search className="mr-2 h-4 w-4" />} label="Go to Dashboard" shortcut="⌘D" />
          <CommandItem onSelect={() => { onSelectAction('leads'); setOpen(false); }} icon={<User className="mr-2 h-4 w-4" />} label="View Leads" shortcut="⌘L" />
          <CommandItem onSelect={() => { onSelectAction('campaigns'); setOpen(false); }} icon={<Send className="mr-2 h-4 w-4" />} label="View Campaigns" shortcut="⌘C" />
          <CommandItem onSelect={() => { onSelectAction('templates'); setOpen(false); }} icon={<FileText className="mr-2 h-4 w-4" />} label="View Templates" />
          <CommandItem onSelect={() => { onSelectAction('domains'); setOpen(false); }} icon={<Globe className="mr-2 h-4 w-4" />} label="Domain Settings" />
        </Command.Group>

        <Command.Separator className="h-[1px] bg-[#27272a] my-2" />

        <Command.Group heading="Actions" className="px-2 py-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
          <CommandItem onSelect={() => { onSelectAction('create-lead'); setOpen(false); }} icon={<Plus className="mr-2 h-4 w-4" />} label="Add New Lead" />
          <CommandItem onSelect={() => { onSelectAction('create-campaign'); setOpen(false); }} icon={<Plus className="mr-2 h-4 w-4" />} label="Create Campaign" />
          <CommandItem onSelect={() => { onSelectAction('create-template'); setOpen(false); }} icon={<Plus className="mr-2 h-4 w-4" />} label="Create Template" />
          <CommandItem onSelect={() => { onSelectAction('settings'); setOpen(false); }} icon={<Settings className="mr-2 h-4 w-4" />} label="Workspace Settings" shortcut="⌘," />
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
