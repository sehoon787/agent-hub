import Link from 'next/link';
import { Star, GitFork, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getTopAgentsByStars } from '@/lib/data';
import { AgentDisplayName } from '@/components/ui/agent-display-name';

const platformColors: Record<string, string> = {
  claude: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  gemini: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  codex: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  universal: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  cursor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  windsurf: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  aider: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

export function RankingSection() {
  const topAgents = getTopAgentsByStars(10);

  if (topAgents.length === 0) return null;

  return (
    <section className="py-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-yellow-400" />
          <h2 className="text-2xl font-bold text-zinc-100">Top Agents by Stars</h2>
        </div>
        <Link
          href="/agents?sort=stars"
          className="text-sm text-violet-400 hover:text-violet-300"
        >
          View full ranking →
        </Link>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th className="pb-3 pr-4 font-medium">#</th>
              <th className="pb-3 pr-4 font-medium">Agent</th>
              <th className="pb-3 pr-4 font-medium">Platform</th>
              <th className="pb-3 pr-4 font-medium text-right">
                <span className="flex items-center justify-end gap-1">
                  <Star className="h-3 w-3" /> Stars
                </span>
              </th>
              <th className="hidden pb-3 font-medium text-right sm:table-cell">
                <span className="flex items-center justify-end gap-1">
                  <GitFork className="h-3 w-3" /> Forks
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {topAgents.map((agent, i) => (
              <tr key={agent.slug} className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30">
                <td className="py-3 pr-4">
                  <span className={`text-sm font-bold ${i < 3 ? 'text-yellow-400' : 'text-zinc-500'}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <Link href={`/agents/${agent.slug}`} className="text-sm font-medium text-zinc-200 hover:text-white">
                    <AgentDisplayName displayName={agent.displayName} />
                  </Link>
                </td>
                <td className="py-3 pr-4">
                  <Badge variant="outline" className={`text-xs ${platformColors[agent.platform] ?? ''}`}>
                    {agent.platform}
                  </Badge>
                </td>
                <td className="py-3 pr-4 text-right">
                  <span className="text-sm text-zinc-300">{agent.stars.toLocaleString()}</span>
                </td>
                <td className="hidden py-3 text-right sm:table-cell">
                  <span className="text-sm text-zinc-400">{agent.forks.toLocaleString()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
