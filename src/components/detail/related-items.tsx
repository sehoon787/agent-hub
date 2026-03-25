import type { Agent } from '@/lib/types';
import { AgentCard } from '@/components/cards/agent-card';

export function RelatedAgents({ agents }: { agents: Agent[] }) {
  if (agents.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-zinc-100">Related Agents</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <AgentCard key={a.slug} agent={a} />
        ))}
      </div>
    </section>
  );
}
