'use client';

import { useState, useMemo } from 'react';
import { getAgents } from '@/lib/data';
import { AgentCard } from '@/components/cards/agent-card';
import { SearchInput } from '@/components/search/search-input';
import { FilterSidebar } from '@/components/filters/filter-sidebar';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { SlidersHorizontal } from 'lucide-react';

const BROWSE_PLATFORM_MODELS: Record<string, { value: string; label: string }[]> = {
  claude: [
    { value: 'sonnet', label: 'Sonnet (Coding)' },
    { value: 'opus', label: 'Opus (Deep Reasoning)' },
    { value: 'haiku', label: 'Haiku (Fast)' },
  ],
  gemini: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  ],
  codex: [
    { value: 'gpt-5.4', label: 'GPT-5.4' },
  ],
};

const ALL_BROWSE_MODELS = [
  { value: 'sonnet', label: 'Sonnet (Coding)' },
  { value: 'opus', label: 'Opus (Deep Reasoning)' },
  { value: 'haiku', label: 'Haiku (Fast)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gpt-5.4', label: 'GPT-5.4' },
];

export function AgentsBrowse() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);
  const [sort, setSort] = useState('popular');
  const [page, setPage] = useState(1);

  const { items, total } = useMemo(() => {
    return getAgents({
      q: q || undefined,
      category: category || undefined,
      model: model || undefined,
      source: source || undefined,
      platform: platform || undefined,
      sort,
      page,
      limit: 12,
    });
  }, [q, category, model, source, platform, sort, page]);

  const totalPages = Math.ceil(total / 12);

  const filterGroups = [
    {
      title: 'Platform',
      options: [
        { value: 'claude', label: 'Claude' },
        { value: 'gemini', label: 'Gemini' },
        { value: 'codex', label: 'Codex' },
        { value: 'universal', label: 'Universal' },
      ],
      selected: platform,
      onSelect: (v: string | null) => {
        setPlatform(v);
        // Reset model if incompatible with new platform
        if (v && BROWSE_PLATFORM_MODELS[v] && model) {
          const compatibleValues = BROWSE_PLATFORM_MODELS[v].map(m => m.value);
          if (!compatibleValues.includes(model)) {
            setModel(null);
          }
        }
        setPage(1);
      },
    },
    {
      title: 'Category',
      options: [
        { value: 'orchestrator', label: 'Orchestrator' },
        { value: 'specialist', label: 'Specialist' },
        { value: 'worker', label: 'Worker' },
        { value: 'analyst', label: 'Analyst' },
      ],
      selected: category,
      onSelect: (v: string | null) => { setCategory(v); setPage(1); },
    },
    {
      title: 'Model',
      options: platform && BROWSE_PLATFORM_MODELS[platform]
        ? BROWSE_PLATFORM_MODELS[platform]
        : ALL_BROWSE_MODELS,
      selected: model,
      onSelect: (v: string | null) => { setModel(v); setPage(1); },
    },
    {
      title: 'Source',
      options: [
        { value: 'official', label: 'Official' },
        { value: 'community', label: 'Community' },
        { value: 'plugin', label: 'Plugin' },
      ],
      selected: source,
      onSelect: (v: string | null) => { setSource(v); setPage(1); },
    },
  ];

  const sortOptions = [
    { value: 'popular', label: 'Most Popular' },
    { value: 'recent', label: 'Recently Added' },
    { value: 'name', label: 'Name A-Z' },
  ];

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-zinc-100">Agents</h1>
      <p className="mt-1 text-zinc-400">Browse AI coding agents across Claude, Gemini, and Codex platforms</p>

      <div className="mt-6">
        <SearchInput
          defaultValue={q}
          onChange={(v) => { setQ(v); setPage(1); }}
          placeholder="Search agents..."
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Showing {items.length} of {total} agents
        </p>
        <div className="flex items-center gap-3">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <Sheet>
            <SheetTrigger className="rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-400 hover:text-zinc-200 lg:hidden">
              <SlidersHorizontal className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-zinc-800 bg-zinc-950">
              <SheetTitle className="sr-only">Filters</SheetTitle>
              <div className="mt-8">
                <FilterSidebar groups={filterGroups} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="mt-6 flex gap-8">
        <div className="hidden w-48 shrink-0 lg:block">
          <FilterSidebar groups={filterGroups} />
        </div>
        <div className="flex-1">
          {items.length === 0 ? (
            <p className="py-20 text-center text-zinc-500">No agents found matching your criteria.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((a) => (
                <AgentCard key={a.slug} agent={a} />
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-md px-3 py-1 text-sm ${
                    p === page
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
