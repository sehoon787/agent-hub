'use client';

import { Bot, Layers, Users, Monitor, Workflow } from 'lucide-react';
import { getStats } from '@/lib/data';
import { StatCard } from '@/components/cards/stat-card';

export function StatsSection() {
  const stats = getStats();
  return (
    <section className="py-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Agents" value={stats.totalAgents} icon={Bot} color="bg-violet-500/20 text-violet-400" />
        <StatCard label="Categories" value={stats.totalCategories} icon={Layers} color="bg-blue-500/20 text-blue-400" />
        <StatCard label="Contributors" value={stats.totalContributors} icon={Users} color="bg-emerald-500/20 text-emerald-400" />
        <StatCard label="Platforms" value={stats.totalPlatforms} icon={Monitor} color="bg-amber-500/20 text-amber-400" />
        <StatCard label="Workflow Stages" value={stats.totalStages} icon={Workflow} color="bg-teal-500/20 text-teal-400" />
      </div>
    </section>
  );
}
