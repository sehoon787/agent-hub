import Link from 'next/link';
import { Bot, Sparkles } from 'lucide-react';
import { getFeaturedAgents, getRecentAgents } from '@/lib/data';
import { AgentCard } from '@/components/cards/agent-card';

export async function FeaturedSection() {
  const featured = (await getFeaturedAgents()).slice(0, 6);
  const recent = await getRecentAgents(6);

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
      <div className="mt-6 space-y-10">
        {(() => {
          const recentAgents = recent.filter((a) => a.type !== 'skill');
          const recentSkills = recent.filter((a) => a.type === 'skill');
          return (
            <>
              {recentAgents.length > 0 && (
                <section>
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-violet-400" />
                    <h3 className="text-lg font-semibold text-zinc-100">Agents</h3>
                    <span className="text-sm text-zinc-500">({recentAgents.length})</span>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {recentAgents.map((a) => <AgentCard key={a.slug} agent={a} />)}
                  </div>
                </section>
              )}
              {recentSkills.length > 0 && (
                <section>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-cyan-400" />
                    <h3 className="text-lg font-semibold text-zinc-100">Skills</h3>
                    <span className="text-sm text-zinc-500">({recentSkills.length})</span>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {recentSkills.map((a) => <AgentCard key={a.slug} agent={a} />)}
                  </div>
                </section>
              )}
            </>
          );
        })()}
      </div>
    </section>
  );
}
