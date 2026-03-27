import type { Metadata } from 'next';
import { SubmissionsList } from './submissions-list';

export const metadata: Metadata = {
  title: 'My Submissions',
  description: 'Track your agent submissions on AgentHub.',
};

export default function MySubmissionsPage() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-zinc-100">My Submissions</h1>
      <p className="mt-1 text-zinc-400">
        Track the status of your agent submissions.
      </p>
      <SubmissionsList />
    </div>
  );
}
