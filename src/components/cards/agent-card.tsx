import Link from 'next/link';
import { Bot, Download, Star, BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Agent } from '@/lib/types';
import { InstallCommand } from '@/components/detail/install-command';

const modelColors: Record<string, string> = {
  opus: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  sonnet: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  haiku: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const platformColors: Record<string, string> = {
  claude: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  gemini: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  codex: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  universal: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

const categoryLabels: Record<string, string> = {
  orchestrator: 'Orchestrator',
  specialist: 'Specialist',
  worker: 'Worker',
  analyst: 'Analyst',
};

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Link
      href={`/agents/${agent.slug}`}
      className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-zinc-400" />
          <h3 className="font-semibold text-zinc-100 group-hover:text-white">
            {agent.displayName}
          </h3>
          {agent.verified && (
            <BadgeCheck className="h-4 w-4 text-emerald-400" aria-label="Verified" />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={platformColors[agent.platform]}>
            {agent.platform}
          </Badge>
          <Badge variant="outline" className={modelColors[agent.model]}>
            {agent.model}
          </Badge>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
        {agent.description}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="text-xs">
          {categoryLabels[agent.category]}
        </Badge>
        {agent.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="outline" className="border-zinc-700 text-xs text-zinc-500">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3" /> {agent.stars.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" /> {agent.downloads.toLocaleString()}
          </span>
        </div>
        <div className="mt-2">
          <InstallCommand command={agent.installCommand} compact />
        </div>
      </div>
    </Link>
  );
}
