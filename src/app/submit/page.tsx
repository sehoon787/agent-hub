import type { Metadata } from 'next';
import { SubmitForm } from './submit-form';

export const metadata: Metadata = {
  title: 'Submit Agent',
  description: 'Submit your AI coding agent to AgentHub.',
};

export default function SubmitPage() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-zinc-100">Submit an Agent</h1>
      <p className="mt-1 text-zinc-400">
        Share your AI coding agent with the community.
      </p>
      <SubmitForm />
    </div>
  );
}
