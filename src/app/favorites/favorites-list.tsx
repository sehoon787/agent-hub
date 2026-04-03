'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import { Loader2, LogIn, Heart, Bot, Sparkles } from 'lucide-react';
import { AgentCard } from '@/components/cards/agent-card';
import type { Agent } from '@/lib/types';
import { useFavorites } from '@/hooks/use-favorites';

export function FavoritesList() {
  const { data: session, status: authStatus } = useSession();
  const { favorites, loading: favsLoading } = useFavorites();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (favsLoading || favorites.size === 0) {
      setLoading(false);
      return;
    }

    async function fetchAgents() {
      try {
        // Fetch agent details for each favorited slug
        const results = await Promise.all(
          Array.from(favorites).map(async (slug) => {
            const res = await fetch(`/api/agents/${slug}`);
            if (res.ok) return res.json();
            return null;
          })
        );
        setAgents(results.filter(Boolean));
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    }

    fetchAgents();
  }, [favorites, favsLoading]);

  if (authStatus === 'loading' || favsLoading) {
    return (
      <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-12">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-12">
        <LogIn className="h-12 w-12 text-zinc-500" />
        <h2 className="text-xl font-semibold text-zinc-100">Sign in Required</h2>
        <p className="text-sm text-zinc-400">Sign in with GitHub to view your favorites.</p>
        <button
          onClick={() => signIn('github', { callbackUrl: '/favorites' })}
          className="mt-4 flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          Sign in with GitHub
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-12">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        <p className="text-sm text-zinc-400">Loading your favorites...</p>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-12">
        <Heart className="h-12 w-12 text-zinc-500" />
        <p className="text-zinc-400">No favorites yet.</p>
        <Link
          href="/agents"
          className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          Browse Agents & Skills
        </Link>
      </div>
    );
  }

  const favoriteAgents = agents.filter((a) => a.type !== 'skill');
  const favoriteSkills = agents.filter((a) => a.type === 'skill');

  return (
    <div className="mt-6 space-y-10">
      {favoriteAgents.length > 0 && (
        <section>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Agents</h2>
            <span className="text-sm text-zinc-500">({favoriteAgents.length})</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteAgents.map((agent) => (
              <AgentCard key={agent.slug} agent={agent} />
            ))}
          </div>
        </section>
      )}
      {favoriteSkills.length > 0 && (
        <section>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Skills</h2>
            <span className="text-sm text-zinc-500">({favoriteSkills.length})</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteSkills.map((agent) => (
              <AgentCard key={agent.slug} agent={agent} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
