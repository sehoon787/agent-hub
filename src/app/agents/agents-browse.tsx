'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAgents } from '@/lib/data';
import { AgentCard } from '@/components/cards/agent-card';
import { SearchInput } from '@/components/search/search-input';
import { FilterSidebar } from '@/components/filters/filter-sidebar';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Pagination } from '@/components/ui/pagination';
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
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(searchParams.get('platform'));
  const [sort, setSort] = useState(searchParams.get('sort') === 'stars' ? 'popular' : 'popular');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [repo, setRepo] = useState<string | null>(searchParams.get('repo'));

  const { items, total } = useMemo(() => {
    return getAgents({
      q: q || undefined,
      category: category || undefined,
      stage: stage || undefined,
      model: model || undefined,
      source: source || undefined,
      platform: platform || undefined,
      repo: repo || undefined,
      sort,
      page,
      limit: perPage,
    });
  }, [q, category, stage, model, source, platform, sort, page, perPage, repo]);

  const totalPages = Math.ceil(total / perPage);

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
      title: 'Stage',
      options: [
        { value: 'discover', label: 'Discover' },
        { value: 'plan', label: 'Plan' },
        { value: 'implement', label: 'Implement' },
        { value: 'review', label: 'Review' },
        { value: 'verify', label: 'Verify' },
        { value: 'debug', label: 'Debug' },
        { value: 'operate', label: 'Operate' },
      ],
      selected: stage,
      onSelect: (v: string | null) => { setStage(v); setPage(1); },
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

      {repo && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-zinc-400">Repository:</span>
          <span className="flex items-center gap-1.5 rounded-full bg-violet-600/20 px-3 py-1 text-sm text-violet-300">
            {repo.split('/')[1]}
            <button onClick={() => setRepo(null)} className="ml-1 text-violet-400 hover:text-white">✕</button>
          </span>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">
          {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300"
          >
            {[12, 24, 48].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
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
          <div className="mt-8">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
