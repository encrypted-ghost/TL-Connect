import { Mail, MoreVertical, Edit2, Trash2, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/src/components/ui/dropdown-menu';

interface Template {
  id: string;
  name: string;
  subject: string;
  category: string;
  updatedAt: string;
}

interface TemplateListProps {
  templates: Template[];
  onEdit: (template: Template) => void;
  onDelete: (id: string) => void;
}

export function TemplateList({ templates, onEdit, onDelete }: TemplateListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category));
    return Array.from(cats).sort();
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (!selectedCategory) return templates;
    return templates.filter(t => t.category === selectedCategory);
  }, [templates, selectedCategory]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-xs border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800">
              <Filter size={14} className={selectedCategory ? "text-indigo-400" : "text-neutral-500"} />
              {selectedCategory || 'All Categories'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-neutral-950 border-neutral-800 w-48">
            <DropdownMenuItem 
              onClick={() => setSelectedCategory(null)}
              className="text-xs focus:bg-neutral-800 flex items-center justify-between"
            >
              All Categories
              {!selectedCategory && <div className="w-1 h-1 rounded-full bg-indigo-500" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-neutral-800" />
            {categories.map(cat => (
              <DropdownMenuItem 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="text-xs focus:bg-neutral-800 flex items-center justify-between"
              >
                {cat}
                {selectedCategory === cat && <div className="w-1 h-1 rounded-full bg-indigo-500" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {selectedCategory && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] uppercase tracking-wider text-neutral-500 hover:text-neutral-300"
            onClick={() => setSelectedCategory(null)}
          >
            Clear Filter
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <div 
            key={template.id} 
            className="group relative flex flex-col p-5 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-all shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-neutral-800 rounded-lg">
                <Mail size={18} className="text-neutral-400" />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-white">
                    <MoreVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800">
                  <DropdownMenuItem 
                    onClick={() => onEdit(template)}
                    className="flex items-center gap-2 cursor-pointer text-neutral-300 focus:bg-neutral-800 focus:text-white"
                  >
                    <Edit2 size={14} /> Edit Template
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(template.id)}
                    className="flex items-center gap-2 cursor-pointer text-red-400 focus:bg-red-950 focus:text-red-300"
                  >
                    <Trash2 size={14} /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mb-2">
              <h3 className="font-semibold text-neutral-100 truncate">{template.name}</h3>
              <p className="text-xs text-neutral-500 truncate mt-1">Subject: {template.subject}</p>
            </div>

            <div className="mt-auto pt-4 flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-neutral-800 border-neutral-700 text-neutral-400">
                {template.category}
              </Badge>
              <span className="text-[10px] text-neutral-600">
                Last updated {new Date(template.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="py-20 text-center border border-dashed border-neutral-800 rounded-xl">
          <p className="text-sm text-neutral-500 text-center">No templates found in this category.</p>
        </div>
      )}
    </div>
  );
}
