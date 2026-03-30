'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, Search } from 'lucide-react';
import { SearchInput } from '@/components/search/search-input';
import { searchAll } from '@/lib/data';
import type { SearchResult } from '@/lib/types';
import { AgentDisplayName } from '@/components/ui/agent-display-name';

function ResultItem({ result }: { result: SearchResult }) {
  return (
    <Link
      href={`/agents/${result.slug}`}
      className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
    >
      <Bot className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-zinc-100"><AgentDisplayName displayName={result.displayName} /></h3>
        <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{result.description}</p>
      </div>
    </Link>
  );
}

export function SearchResults({ query }: { query: string }) {
  const [q, setQ] = useState(query);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    return searchAll(q);
  }, [q]);

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-zinc-100">Search</h1>
      <div className="mt-4">
        <SearchInput defaultValue={q} onChange={setQ} />
      </div>

      {!q.trim() && (
        <div className="mt-20 flex flex-col items-center gap-3 text-zinc-500">
          <Search className="h-12 w-12" />
          <p>Type to search agents</p>
        </div>
      )}

      {q.trim() && results.length === 0 && (
        <p className="mt-20 text-center text-zinc-500">
          No results found for &ldquo;{q}&rdquo;
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-6 space-y-8">
          <p className="text-sm text-zinc-500">
            {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{q}&rdquo;
          </p>
          <div className="space-y-2">
            {results.map((r) => <ResultItem key={r.slug} result={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}
