import Link from 'next/link';
import { Bot, GitFork, Star, BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Agent } from '@/lib/types';
import { InstallCommand } from '@/components/detail/install-command';
import { AgentDisplayName } from '@/components/ui/agent-display-name';

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
  cursor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  windsurf: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  aider: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const categoryLabels: Record<string, string> = {
  orchestrator: 'Orchestrator',
  specialist: 'Specialist',
  worker: 'Worker',
  analyst: 'Analyst',
};

const stageColors: Record<string, string> = {
  discover: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  plan: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  implement: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
  review: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  verify: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  debug: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  operate: 'bg-stone-500/20 text-stone-300 border-stone-500/30',
};

const stageLabels: Record<string, string> = {
  discover: 'Discover',
  plan: 'Plan',
  implement: 'Implement',
  review: 'Review',
  verify: 'Verify',
  debug: 'Debug',
  operate: 'Operate',
};


export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Link
      href={`/agents/${agent.slug}`}
      className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700"
    >
      {/* Row 1: name + @owner + verified badge */}
      <div className="flex items-start gap-2">
        <Bot className="h-5 w-5 shrink-0 text-zinc-400 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-semibold text-zinc-100 group-hover:text-white">
              <AgentDisplayName displayName={agent.displayName} nameOnly />
            </h3>
            {agent.verified && (
              <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Verified" />
            )}
          </div>
          <AgentDisplayName displayName={agent.displayName} repoOnly />
        </div>
      </div>
      {/* Row 2: platform + model badges */}
      <div className="mt-1 flex items-center gap-1.5 pl-0">
        <Badge variant="outline" className={platformColors[agent.platform]}>
          {agent.platform}
        </Badge>
        <Badge variant="outline" className={modelColors[agent.model]}>
          {agent.model}
        </Badge>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
        {agent.description}
      </p>
      <div className="mt-3 flex flex-wrap items-start gap-1.5">
        <Badge variant="secondary" className="text-xs">
          {categoryLabels[agent.category]}
        </Badge>
        {agent.stages?.slice(0, 2).map((s) => (
          <Badge key={s} variant="outline" className={`text-xs ${stageColors[s] ?? ''}`}>
            {stageLabels[s] ?? s}
          </Badge>
        ))}
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
            <GitFork className="h-3 w-3" /> {agent.forks.toLocaleString()}
          </span>
        </div>
        <div className="mt-2">
          <InstallCommand command={agent.installCommand} compact />
        </div>
      </div>
    </Link>
  );
}
