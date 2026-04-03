'use client';

import { useState, useEffect } from 'react';
import { Bot, Sparkles, GitFork, Monitor, Users } from 'lucide-react';
import { StatCard } from '@/components/cards/stat-card';

export function StatsSection() {
  const [stats, setStats] = useState({ totalAgents: 0, totalSkills: 0, totalRepositories: 0, totalPlatforms: 0, totalContributors: 0 });

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {});
  }, []);

  return (
    <section className="py-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Agents" value={stats.totalAgents} icon={Bot} color="bg-violet-500/20 text-violet-400" />
        <StatCard label="Total Skills" value={stats.totalSkills} icon={Sparkles} color="bg-cyan-500/20 text-cyan-400" />
        <StatCard label="Repositories" value={stats.totalRepositories} icon={GitFork} color="bg-blue-500/20 text-blue-400" />
        <StatCard label="Platforms" value={stats.totalPlatforms} icon={Monitor} color="bg-amber-500/20 text-amber-400" />
        <StatCard label="Contributors" value={stats.totalContributors} icon={Users} color="bg-emerald-500/20 text-emerald-400" />
      </div>
    </section>
  );
}
