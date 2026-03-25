'use client';

import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterGroupProps {
  title: string;
  options: FilterOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}

function FilterGroup({ title, options, selected, onSelect }: FilterGroupProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      <div className="mt-2 space-y-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(selected === opt.value ? null : opt.value)}
            className={cn(
              'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors',
              selected === opt.value
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
            )}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span className="text-xs text-zinc-600">{opt.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface FilterSidebarProps {
  groups: {
    title: string;
    options: FilterOption[];
    selected: string | null;
    onSelect: (value: string | null) => void;
  }[];
}

export function FilterSidebar({ groups }: FilterSidebarProps) {
  return (
    <aside className="space-y-6">
      {groups.map((group) => (
        <FilterGroup key={group.title} {...group} />
      ))}
    </aside>
  );
}
