import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SubmitForm } from './submit-form';

export const metadata: Metadata = {
  title: 'Submit Agent or Skill',
  description: 'Submit your AI coding agent or skill to AgentHub.',
};

export default function SubmitPage() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-zinc-100">Submit an Agent or Skill</h1>
      <p className="mt-1 text-zinc-400">
        Share your AI coding agent or skill with the community.
      </p>
      <Suspense><SubmitForm /></Suspense>
    </div>
  );
}
