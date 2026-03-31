'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bot, Star, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AgentPlatform, RepoSummary } from '@/lib/types';

const platformColors: Record<string, string> = {
  claude: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  gemini: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  codex: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  universal: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  cursor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  windsurf: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  aider: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const FILTER_TABS = ['all', 'claude', 'gemini', 'codex', 'universal'] as const;

interface CompactRankingProps {
  repos: RepoSummary[];
}

export function CompactRanking({ repos }: CompactRankingProps) {
  const [filter, setFilter] = useState<string>('all');

  const base = filter === 'all' ? repos : repos.filter((r) => r.platforms.includes(filter as AgentPlatform));
  const filtered = base.slice(0, 5);

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          <h3 className="font-semibold text-zinc-100">Top Repositories</h3>
        </div>
        <Link
          href="/agents?sort=stars"
          className="text-xs text-violet-400 hover:text-violet-300"
        >
          View all &rarr;
        </Link>
      </div>

      <div className="mt-3 flex gap-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors ${
              filter === tab
                ? 'bg-violet-600 text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            {tab === 'all' ? 'All' : tab}
          </button>
        ))}
      </div>

      <div className="mt-3 flex-1">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-zinc-500">No repositories for this platform</p>
        ) : (
          <table className="w-full">
            <tbody>
              {filtered.map((repo, i) => (
                <tr key={repo.repoKey} className="border-b border-zinc-800/50 last:border-0">
                  <td className="py-2 pr-2">
                    <span className={`text-sm font-bold ${i < 3 ? 'text-yellow-400' : 'text-zinc-500'}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-2 pr-2">
                    <Link href={`/agents?repo=${repo.repoKey}`} className="text-sm font-medium text-zinc-200 hover:text-white">
                      {repo.repoName}
                    </Link>
                  </td>
                  <td className="py-2 pr-2">
                    <Badge variant="outline" className={`text-xs ${platformColors[repo.platforms[0]] ?? ''}`}>
                      {repo.platforms[0]}
                    </Badge>
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <span className="flex items-center justify-end gap-1 text-sm text-zinc-300">
                      <Star className="h-3 w-3 text-yellow-400" />
                      {repo.stars.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <span className="flex items-center justify-end gap-1 text-xs text-zinc-500">
                      <Bot className="h-3 w-3" />
                      {repo.agentCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
