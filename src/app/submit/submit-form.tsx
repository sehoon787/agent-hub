'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Bot, CheckCircle2, LogIn } from 'lucide-react';

interface FormData {
  name: string;
  displayName: string;
  description: string;
  longDescription: string;
  githubUrl: string;
  category: string;
  model: string;
  platform: string;
  author: string;
  capabilities: string;
  tools: string;
  tags: string;
}

const initial: FormData = {
  name: '',
  displayName: '',
  description: '',
  longDescription: '',
  githubUrl: '',
  category: '',
  model: 'sonnet',
  platform: '',
  author: '',
  capabilities: '',
  tools: '',
  tags: '',
};

export function SubmitForm() {
  const { data: session, status } = useSession();
  const [form, setForm] = useState<FormData>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [issueUrl, setIssueUrl] = useState('');
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Auto-fill author from session
  useEffect(() => {
    if (session?.user?.name && !form.author) {
      update('author', session.user.name);
    }
  }, [session]);

  // Treat prolonged loading as unauthenticated (auth may not be configured)
  useEffect(() => {
    if (status === 'loading') {
      const timer = setTimeout(() => setLoadingTimedOut(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user types
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    if (loading) return;
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.issueUrl) setIssueUrl(data.issueUrl);
        setSubmitted(true);
        setForm(initial);
      } else if (data.details && typeof data.details === 'object') {
        setFieldErrors(data.details);
        setError(data.error || 'Validation failed. Please check the fields below.');
      } else {
        setError(data.error || 'Submission failed. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while session is being fetched (with timeout fallback)
  if (status === 'loading' && !loadingTimedOut) {
    return (
      <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-12">
        <div className="h-12 w-12 animate-pulse rounded-full bg-zinc-800" />
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!session?.user) {
    return (
      <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-12">
        <LogIn className="h-12 w-12 text-zinc-500" />
        <h2 className="text-xl font-semibold text-zinc-100">Sign in Required</h2>
        <p className="text-sm text-zinc-400">
          You need to sign in with GitHub to submit an agent.
        </p>
        <button
          onClick={() => signIn('github', { callbackUrl: '/submit' })}
          className="mt-4 flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Sign in with GitHub
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-12">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <h2 className="text-xl font-semibold text-zinc-100">Submission Received</h2>
        <p className="text-sm text-zinc-400">Your agent has been submitted and is pending review. Thank you for contributing!</p>
        <div className="mt-4 flex items-center gap-3">
          {issueUrl && (
            <a
              href={issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
            >
              View on GitHub
            </a>
          )}
          <button
            onClick={() => { setSubmitted(false); setIssueUrl(''); }}
            className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-300">Name (slug)</label>
          <Input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. my-agent (lowercase, hyphens only)"
            className="mt-1 border-zinc-700 bg-zinc-800/50 text-zinc-100"
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-red-400">{fieldErrors.name[0]}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Display Name</label>
          <Input
            value={form.displayName}
            onChange={(e) => update('displayName', e.target.value)}
            placeholder="e.g. My Agent"
            className="mt-1 border-zinc-700 bg-zinc-800/50 text-zinc-100"
          />
          {fieldErrors.displayName && <p className="mt-1 text-xs text-red-400">{fieldErrors.displayName[0]}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Description</label>
          <Textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Brief description of what the agent does..."
            className="mt-1 border-zinc-700 bg-zinc-800/50 text-zinc-100"
            rows={2}
          />
          {fieldErrors.description && <p className="mt-1 text-xs text-red-400">{fieldErrors.description[0]}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Long Description</label>
          <Textarea
            value={form.longDescription}
            onChange={(e) => update('longDescription', e.target.value)}
            placeholder="Detailed description (2-3 sentences)..."
            className="mt-1 border-zinc-700 bg-zinc-800/50 text-zinc-100"
            rows={3}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-zinc-300">Category</label>
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300"
            >
              <option value="">Select category</option>
              <option value="orchestrator">Orchestrator</option>
              <option value="specialist">Specialist</option>
              <option value="worker">Worker</option>
              <option value="analyst">Analyst</option>
            </select>
            {fieldErrors.category && <p className="mt-1 text-xs text-red-400">{fieldErrors.category[0]}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300">Model</label>
            <select
              value={form.model}
              onChange={(e) => update('model', e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300"
            >
              <option value="opus">Opus (Claude)</option>
              <option value="sonnet">Sonnet (Claude)</option>
              <option value="haiku">Haiku (Claude)</option>
              <option value="gemini-pro">Gemini Pro</option>
              <option value="gemini-flash">Gemini Flash</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="o3">o3</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Platform</label>
          <select
            value={form.platform}
            onChange={(e) => update('platform', e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300"
          >
            <option value="">Select platform</option>
            <option value="claude">Claude Code</option>
            <option value="gemini">Gemini CLI</option>
            <option value="codex">Codex CLI</option>
            <option value="cursor">Cursor</option>
            <option value="windsurf">Windsurf</option>
            <option value="aider">Aider</option>
            <option value="universal">Universal</option>
          </select>
          {fieldErrors.platform && <p className="mt-1 text-xs text-red-400">{fieldErrors.platform[0]}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Author</label>
          <Input
            value={form.author}
            onChange={(e) => update('author', e.target.value)}
            placeholder="e.g. your-username"
            className="mt-1 border-zinc-700 bg-zinc-800/50 text-zinc-100"
          />
          {fieldErrors.author && <p className="mt-1 text-xs text-red-400">{fieldErrors.author[0]}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">GitHub URL</label>
          <Input
            value={form.githubUrl}
            onChange={(e) => update('githubUrl', e.target.value)}
            placeholder="https://github.com/..."
            className="mt-1 border-zinc-700 bg-zinc-800/50 text-zinc-100"
          />
          <p className="mt-1 text-xs text-zinc-500">Must be a GitHub URL (https://github.com/owner/repo)</p>
          {fieldErrors.githubUrl && <p className="mt-1 text-xs text-red-400">{fieldErrors.githubUrl[0]}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Capabilities (comma-separated)</label>
          <Input
            value={form.capabilities}
            onChange={(e) => update('capabilities', e.target.value)}
            placeholder="e.g. Code review, TDD workflow, Refactoring"
            className="mt-1 border-zinc-700 bg-zinc-800/50 text-zinc-100"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Tools (comma-separated)</label>
          <Input
            value={form.tools}
            onChange={(e) => update('tools', e.target.value)}
            placeholder="e.g. Bash, Read, Write, Edit, Grep"
            className="mt-1 border-zinc-700 bg-zinc-800/50 text-zinc-100"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Tags (comma-separated)</label>
          <Input
            value={form.tags}
            onChange={(e) => update('tags', e.target.value)}
            placeholder="e.g. testing, tdd, coverage"
            className="mt-1 border-zinc-700 bg-zinc-800/50 text-zinc-100"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Agent'}
        </button>
      </div>

      {/* Preview */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300">Preview</h3>
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-violet-400" />
              <h3 className="font-semibold text-zinc-100">
                {form.displayName || form.name || 'Your Agent'}
              </h3>
            </div>
            {form.model && (
              <Badge variant="outline" className="text-xs">
                {form.model}
              </Badge>
            )}
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
            {form.description || 'Your description will appear here...'}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {form.category && (
              <Badge variant="secondary" className="text-xs capitalize">
                {form.category}
              </Badge>
            )}
            {form.platform && (
              <Badge variant="outline" className="text-xs capitalize">
                {form.platform}
              </Badge>
            )}
            {form.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
              .map((tag) => (
                <Badge key={tag} variant="outline" className="border-zinc-700 text-xs text-zinc-500">
                  {tag}
                </Badge>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
