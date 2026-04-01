'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle2, XCircle, Loader2, LogIn, Trash2, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Submission {
  id: number;
  title: string;
  status: 'pending' | 'approved' | 'listed' | 'rejected';
  slug?: string;
  createdAt: string;
  updatedAt: string;
}

const statusConfig = {
  pending: { icon: Clock, label: 'Pending Review', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  approved: { icon: CheckCircle2, label: 'Approved', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  listed: { icon: CheckCircle2, label: 'Listed', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  rejected: { icon: XCircle, label: 'Closed', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

export function SubmissionsList() {
  const { data: session, status: authStatus } = useSession();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    async function fetchSubmissions() {
      try {
        const res = await fetch('/api/my-submissions');
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to load submissions');
          return;
        }
        const data = await res.json();
        setSubmissions(data.submissions);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchSubmissions();
  }, [authStatus]);

  const handleDelete = async (sub: Submission) => {
    const messages: Record<string, string> = {
      approved: 'This will create a PR to remove this agent. Continue?',
      pending: 'This will close your submission. Continue?',
      rejected: 'This will remove this submission from your list. Continue?',
    };
    if (!confirm(messages[sub.status])) return;

    setActionLoading(sub.id);
    try {
      const isApproved = sub.status === 'approved';
      const url = isApproved
        ? `/api/my-submissions/${sub.id}/approved`
        : `/api/my-submissions/${sub.id}`;
      const res = await fetch(url, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data: Record<string, string> = await res.json().catch(() => ({}));
        alert(data.error || `Failed to delete (${res.status})`);
        return;
      }
      const data: Record<string, string> = await res.json().catch(() => ({}));
      if (data.prUrl) {
        window.open(data.prUrl, '_blank');
      }
      // Remove from list
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  if (authStatus === 'loading') {
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
        <p className="text-sm text-zinc-400">Sign in with GitHub to view your submissions.</p>
        <button
          onClick={() => signIn('github', { callbackUrl: '/my-submissions' })}
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
        <p className="text-sm text-zinc-400">Fetching your submissions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-12 rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
        <p className="text-sm text-red-300">{error}</p>
        {error.toLowerCase().includes('sign') && (
          <button
            onClick={() => signIn('github', { callbackUrl: '/my-submissions' })}
            className="mt-4 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            Sign in again
          </button>
        )}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-12">
        <p className="text-zinc-400">No submissions yet.</p>
        <a
          href="/submit"
          className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          Submit Your First Agent
        </a>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {submissions.map((sub) => {
        const config = statusConfig[sub.status];
        const StatusIcon = config.icon;
        const isLoading = actionLoading === sub.id;
        return (
          <div
            key={sub.id}
            onClick={() => sub.status === 'approved' && sub.slug && router.push(`/agents/${sub.slug}`)}
            className={`flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${
              sub.status === 'approved' && sub.slug ? 'cursor-pointer hover:border-zinc-700' : ''
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-medium text-zinc-100">{sub.title}</h3>
                <Badge variant="outline" className={config.color}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Submitted {new Date(sub.createdAt).toLocaleDateString()} · #{sub.id}
              </p>
            </div>
            <div className="ml-4 flex shrink-0 items-center gap-2">
              {sub.status === 'approved' && sub.slug && (
                <a
                  href={`/agents/${sub.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 rounded-md border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-300 hover:bg-violet-500/20"
                >
                  View Agent
                </a>
              )}
              <a
                href={`/submit?edit=${sub.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </a>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(sub); }}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                {isLoading ? 'Processing...' : 'Remove'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
