import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AgentsBrowse } from '@/app/agents/agents-browse';

export const metadata: Metadata = {
  title: 'Browse Skills',
  description: 'Browse Claude Code skills — reusable capabilities for AI coding agents',
};

export default function SkillsPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-zinc-500">Loading...</div>}>
      <AgentsBrowse defaultType="skill" />
    </Suspense>
  );
}
