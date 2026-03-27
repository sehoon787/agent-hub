import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getRecentAgents } from '@/lib/data';

const platformColors: Record<string, string> = {
  claude: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  gemini: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  codex: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  universal: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  cursor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  windsurf: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  aider: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function RecentAgentsList() {
  const recent = getRecentAgents(5);

  if (recent.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-violet-400" />
          <h3 className="font-semibold text-zinc-100">Recently Added</h3>
        </div>
        <Link
          href="/agents?sort=recent"
          className="text-xs text-violet-400 hover:text-violet-300"
        >
          View all &rarr;
        </Link>
      </div>

      <div className="mt-3 space-y-0">
        {recent.map((agent) => (
          <Link
            key={agent.slug}
            href={`/agents/${agent.slug}`}
            className="flex items-center justify-between border-b border-zinc-800/50 py-2.5 last:border-0 hover:bg-zinc-800/20"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-200">{agent.displayName}</span>
              <Badge variant="outline" className={`text-xs ${platformColors[agent.platform] ?? ''}`}>
                {agent.platform}
              </Badge>
            </div>
            <span className="text-xs text-zinc-500">{relativeDate(agent.createdAt)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
