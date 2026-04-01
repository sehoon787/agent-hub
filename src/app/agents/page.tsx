import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AgentsBrowse } from './agents-browse';
import { CollectionPageJsonLd } from '@/components/seo/json-ld';
import { getStats } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Browse Agents',
  description: 'Discover AI coding agents across Claude, Gemini, and Codex — orchestrators, specialists, workers, and analysts for your development workflow.',
};

export default async function AgentsPage() {
  const stats = await getStats();
  return (
    <>
      <CollectionPageJsonLd count={stats.totalAgents} />
      <Suspense fallback={<div className="py-8 text-center text-zinc-500">Loading...</div>}>
        <AgentsBrowse />
      </Suspense>
    </>
  );
}
