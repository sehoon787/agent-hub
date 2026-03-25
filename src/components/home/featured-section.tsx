import Link from 'next/link';
import { getFeaturedAgents, getRecentAgents } from '@/lib/data';
import { AgentCard } from '@/components/cards/agent-card';

export function FeaturedSection() {
  const featured = getFeaturedAgents().slice(0, 6);
  const recent = getRecentAgents(6);

  return (
    <section className="py-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100">Featured Agents</h2>
          <p className="mt-1 text-sm text-zinc-400">Hand-picked highlights from the community</p>
        </div>
        <Link
          href="/agents"
          className="text-sm text-violet-400 hover:text-violet-300"
        >
          View all &rarr;
        </Link>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((a) => <AgentCard key={a.slug} agent={a} />)}
      </div>

      <div className="mt-12 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100">Recently Added</h2>
          <p className="mt-1 text-sm text-zinc-400">Latest agents added to the registry</p>
        </div>
        <Link
          href="/agents?sort=recent"
          className="text-sm text-violet-400 hover:text-violet-300"
        >
          View all &rarr;
        </Link>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recent.map((a) => <AgentCard key={a.slug} agent={a} />)}
      </div>
    </section>
  );
}
