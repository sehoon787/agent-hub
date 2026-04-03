'use client';

import { useState, useEffect, useMemo, type KeyboardEvent } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles, CheckCircle2, LogIn, Plus, X, Terminal } from 'lucide-react';
interface FormData {
  type: string;  // 'agent' | 'skill'
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
  type: 'agent',
  name: '',
  displayName: '',
  description: '',
  longDescription: '',
  githubUrl: '',
  category: '',
  model: '',
  platform: '',
  author: '',
  capabilities: '',
  tools: '',
  tags: '',
};

/* ── Tag input helper ── */
function TagInput({
  items,
  onAdd,
  onRemove,
  placeholder,
  variant = 'default',
}: {
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  variant?: 'default' | 'mono';
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!items.includes(trimmed)) onAdd(trimmed);
    setDraft('');
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
  };

  return (
    <div>
      <div className="flex gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="mt-1 flex-1 border-zinc-700 bg-zinc-800/50 text-zinc-100"
        />
        <button
          type="button"
          onClick={add}
          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          aria-label="Add"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={item}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${
                variant === 'mono'
                  ? 'border-zinc-700 font-mono text-zinc-400'
                  : 'border-zinc-700 text-zinc-300'
              }`}
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-zinc-500 hover:text-zinc-200"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const ALL_MODELS = [
  { value: 'sonnet', label: 'Sonnet (Claude)' },
  { value: 'opus', label: 'Opus (Claude)' },
  { value: 'haiku', label: 'Haiku (Claude)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gpt-5.4', label: 'GPT-5.4' },
  { value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
  { value: 'custom', label: 'Custom' },
];

const PLATFORM_MODELS: Record<string, string[]> = {
  claude: ['sonnet', 'opus', 'haiku'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  codex: ['gpt-5.4', 'gpt-5.4-mini'],
  cursor: ALL_MODELS.map((m) => m.value),
  windsurf: ALL_MODELS.map((m) => m.value),
  aider: ALL_MODELS.map((m) => m.value),
  universal: ALL_MODELS.map((m) => m.value),
};

const NAME_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const GITHUB_URL_RE = /^https:\/\/github/i;

const modelColors: Record<string, string> = {
  opus: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  sonnet: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  haiku: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const platformColors: Record<string, string> = {
  claude: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  gemini: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  codex: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  universal: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  cursor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  windsurf: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  aider: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

export function SubmitForm() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const [form, setForm] = useState<FormData>(initial);
  const [capabilityItems, setCapabilityItems] = useState<string[]>([]);
  const [toolItems, setToolItems] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [submittedRepo, setSubmittedRepo] = useState('');
  const [submittedType, setSubmittedType] = useState('agent');
  const [submittedItems, setSubmittedItems] = useState<Array<{ name: string; type: string }>>([]);

  const generatedInstallCmd = useMemo(() => {
    if (!form.githubUrl || !form.name) return '';
    const blobMatch = form.githubUrl.match(/github\.com\/([^/]+\/[^/]+)\/blob\/([^/]+)\/(.+)/);
    if (blobMatch) {
      const repoKey = blobMatch[1].replace(/\.git$/, '');
      const branch = blobMatch[2];
      const filePath = blobMatch[3];
      if (form.type === 'skill') {
        return `curl -o ~/.claude/skills/${form.name}/SKILL.md https://raw.githubusercontent.com/${repoKey}/${branch}/${filePath}`;
      }
      return `curl -o ~/.claude/agents/${form.name}.md https://raw.githubusercontent.com/${repoKey}/${branch}/${filePath}`;
    }
    return '';
  }, [form.githubUrl, form.name, form.type]);

  // Auto-fill author from GitHub login (username) on mount
  useEffect(() => {
    const login = session?.user?.login;
    if (login) {
      setForm((prev) => ({ ...prev, author: login }));
    }
  }, [session?.user?.login]);

  // Load existing submission data when editing
  useEffect(() => {
    if (!editId) return;

    async function loadSubmission() {
      try {
        const res = await fetch('/api/my-submissions');
        if (!res.ok) return;
        const data = await res.json();
        const sub = data.submissions.find((s: { id: number; formData?: Partial<FormData> }) => s.id === Number(editId));
        if (!sub?.formData) return;

        setForm((prev) => ({ ...prev, ...sub.formData }));
        if (sub.formData.capabilities) {
          setCapabilityItems(sub.formData.capabilities.split(',').map((s: string) => s.trim()).filter(Boolean));
        }
        if (sub.formData.tools) {
          setToolItems(sub.formData.tools.split(',').map((s: string) => s.trim()).filter(Boolean));
        }
      } catch {
        // Ignore — user can fill manually
      }
    }

    loadSubmission();
  }, [editId]);

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

  const validate = (field: keyof FormData, value: string) => {
    let msg = '';
    if (field === 'name' && value && !NAME_RE.test(value)) {
      msg = 'Must be lowercase alphanumeric with hyphens, cannot start/end with a hyphen.';
    } else if (field === 'githubUrl' && value && !GITHUB_URL_RE.test(value)) {
      msg = 'Must start with https://github';
    } else if (field === 'githubUrl' && value && GITHUB_URL_RE.test(value) && !/\/blob\//.test(value)) {
      msg = 'Must be a direct file URL (e.g. https://github.com/owner/repo/blob/main/agent.md)';
    }
    setClientErrors((prev) => {
      if (!msg) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return { ...prev, [field]: msg };
    });
  };

  const handleGithubUrlBlur = async (url: string) => {
    validate('githubUrl', url);
    if (!url || !/^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+/.test(url)) return;

    setAutoFilling(true);
    try {
      const res = await fetch(`/api/github/repo-info?url=${encodeURIComponent(url)}`);
      if (!res.ok) return;
      const data = await res.json();

      setForm((prev) => {
        const next = { ...prev };
        // Only fill empty fields
        if (!prev.name && data.name) {
          next.name = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
        if (!prev.displayName && data.name) {
          next.displayName = data.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        }
        if (!prev.description && data.description) {
          next.description = data.description.slice(0, 500);
        }
        if (!prev.tags && data.topics?.length) {
          next.tags = data.topics.slice(0, 5).join(', ');
        }
        if (!prev.platform && data.suggestedPlatform) {
          next.platform = data.suggestedPlatform;
        }
        if (!prev.category && data.suggestedCategory) {
          next.category = data.suggestedCategory;
        }
        return next;
      });
    } catch {
      // Silently fail — user can fill manually
    } finally {
      setAutoFilling(false);
    }
  };

  const handlePlatformChange = (platform: string) => {
    update('platform', platform);
    if (!platform) return;
    const allowed = PLATFORM_MODELS[platform] ?? ALL_MODELS.map((m) => m.value);
    if (!allowed.includes(form.model)) {
      setForm((prev) => ({ ...prev, model: allowed[0] }));
    }
  };

  const handleSubmit = async () => {
    if (loading) return;
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const submitUrl = editId ? `/api/my-submissions/${editId}` : '/api/agents';
      const submitMethod = editId ? 'PATCH' : 'POST';
      const res = await fetch(submitUrl, {
        method: submitMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmittedRepo(form.githubUrl);
        setSubmittedType(form.type);
        setSubmittedItems((prev) => [...prev, { name: form.displayName || form.name, type: form.type }]);
        setSubmitted(true);
        setForm(initial);
        setCapabilityItems([]);
        setToolItems([]);
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
        <h2 className="text-xl font-semibold text-zinc-100">{editId ? 'Submission Updated' : 'Submission Received'}</h2>
        <p className="text-sm text-zinc-400">{editId ? 'Your submission has been updated.' : 'Your submission has been received and is pending review. Thank you for contributing!'}</p>
        {submittedItems.length > 1 && (
          <div className="mt-2 w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs font-medium text-zinc-400">Submitted in this session</p>
            <ul className="mt-2 space-y-1">
              {submittedItems.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                  {item.type === 'skill' ? (
                    <Sparkles className="h-3 w-3 text-cyan-400" />
                  ) : (
                    <Bot className="h-3 w-3 text-violet-400" />
                  )}
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => { setSubmitted(false); setSubmittedRepo(''); }}
            className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            Submit Another
          </button>
          {submittedRepo && (
            <button
              onClick={() => {
                setSubmitted(false);
                setForm({ ...initial, githubUrl: submittedRepo.replace(/\/blob\/.*$/, ''), type: submittedType === 'agent' ? 'skill' : 'agent' });
                setSubmittedRepo('');
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
            >
              Submit Related {submittedType === 'agent' ? 'Skill' : 'Agent'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-300">Type</label>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => update('type', 'agent')}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                form.type === 'agent'
                  ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                  : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Bot className="h-4 w-4" />
              Agent
            </button>
            <button
              type="button"
              onClick={() => update('type', 'skill')}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                form.type === 'skill'
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                  : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Skill
            </button>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Name (slug)</label>
          <Input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            onBlur={(e) => validate('name', e.target.value)}
            placeholder="e.g. my-agent (lowercase, hyphens only)"
            className={`mt-1 bg-zinc-800/50 text-zinc-100 ${fieldErrors.name || clientErrors.name ? 'border-red-500' : 'border-zinc-700'}`}
          />
          {clientErrors.name && <p className="mt-1 text-xs text-red-400">{clientErrors.name}</p>}
          {fieldErrors.name && <p className="mt-1 text-xs text-red-400">{fieldErrors.name[0]}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Display Name</label>
          <Input
            value={form.displayName}
            onChange={(e) => update('displayName', e.target.value)}
            placeholder="e.g. My Agent"
            className={`mt-1 bg-zinc-800/50 text-zinc-100 ${fieldErrors.displayName ? 'border-red-500' : 'border-zinc-700'}`}
          />
          {fieldErrors.displayName && <p className="mt-1 text-xs text-red-400">{fieldErrors.displayName[0]}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Description</label>
          <Textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Brief description of what the agent does..."
            className={`mt-1 bg-zinc-800/50 text-zinc-100 ${fieldErrors.description ? 'border-red-500' : 'border-zinc-700'}`}
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
              className={`mt-1 w-full rounded-md border bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300 ${fieldErrors.category ? 'border-red-500' : 'border-zinc-700'}`}
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
            <label className="text-sm font-medium text-zinc-300">Platform</label>
            <select
              value={form.platform}
              onChange={(e) => handlePlatformChange(e.target.value)}
              className={`mt-1 w-full rounded-md border bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300 ${fieldErrors.platform ? 'border-red-500' : 'border-zinc-700'}`}
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
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Model</label>
          <select
            value={form.model}
            onChange={(e) => update('model', e.target.value)}
            disabled={!form.platform}
            className={`mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300 ${!form.platform ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {!form.platform ? (
              <option value="">Select platform first</option>
            ) : (
              ALL_MODELS.filter((m) => PLATFORM_MODELS[form.platform].includes(m.value)).map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">GitHub URL <span className="text-red-400">*</span></label>
          <Input
            value={form.githubUrl}
            onChange={(e) => { update('githubUrl', e.target.value); validate('githubUrl', e.target.value); }}
            onBlur={(e) => handleGithubUrlBlur(e.target.value)}
            placeholder={form.type === 'skill' ? 'https://github.com/owner/repo/blob/main/skills/my-skill/SKILL.md' : 'https://github.com/owner/repo/blob/main/agents/my-agent.md'}
            className={`mt-1 bg-zinc-800/50 text-zinc-100 ${fieldErrors.githubUrl || clientErrors.githubUrl ? 'border-red-500' : 'border-zinc-700'}`}
          />
          <p className="mt-1 text-xs text-zinc-500">{form.type === 'skill' ? 'Full URL to the skill .md file on GitHub' : 'Full URL to the agent .md file on GitHub'}</p>
          {autoFilling && <p className="mt-1 text-xs text-violet-400">Auto-detecting repository info...</p>}
          {clientErrors.githubUrl && <p className="mt-1 text-xs text-red-400">{clientErrors.githubUrl}</p>}
          {fieldErrors.githubUrl && <p className="mt-1 text-xs text-red-400">{fieldErrors.githubUrl[0]}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Capabilities</label>
          <TagInput
            items={capabilityItems}
            onAdd={(item) => {
              const next = [...capabilityItems, item];
              setCapabilityItems(next);
              update('capabilities', next.join(', '));
            }}
            onRemove={(i) => {
              const next = capabilityItems.filter((_, idx) => idx !== i);
              setCapabilityItems(next);
              update('capabilities', next.join(', '));
            }}
            placeholder="e.g. Code review"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Tools</label>
          <TagInput
            items={toolItems}
            onAdd={(item) => {
              const next = [...toolItems, item];
              setToolItems(next);
              update('tools', next.join(', '));
            }}
            onRemove={(i) => {
              const next = toolItems.filter((_, idx) => idx !== i);
              setToolItems(next);
              update('tools', next.join(', '));
            }}
            placeholder="e.g. Bash"
            variant="mono"
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
          {loading ? (editId ? 'Updating...' : 'Submitting...') : (editId ? 'Update Submission' : `Submit ${form.type === 'skill' ? 'Skill' : 'Agent'}`)}
        </button>
      </div>

      {/* Preview */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300">Preview</h3>
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {form.type === 'skill' ? (
                <Sparkles className="h-5 w-5 shrink-0 text-cyan-400" />
              ) : (
                <Bot className="h-5 w-5 shrink-0 text-violet-400" />
              )}
              <h3 className="truncate font-semibold text-zinc-100">
                {form.displayName || form.name || 'Your Agent'}
              </h3>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {form.platform && (
                <Badge variant="outline" className={`text-xs ${platformColors[form.platform] ?? ''}`}>
                  {form.platform}
                </Badge>
              )}
              {form.model && (
                <Badge variant="outline" className={`text-xs ${modelColors[form.model] ?? ''}`}>
                  {form.model}
                </Badge>
              )}
            </div>
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
            {form.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
              .slice(0, 2)
              .map((tag) => (
                <Badge key={tag} variant="outline" className="border-zinc-700 text-xs text-zinc-500">
                  {tag}
                </Badge>
              ))}
          </div>
          {capabilityItems.length > 0 && (
            <div className="mt-3 border-t border-zinc-800 pt-3">
              <p className="text-xs text-zinc-500 mb-1.5">Capabilities</p>
              <ul className="space-y-1">
                {capabilityItems.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {toolItems.length > 0 && (
            <div className="mt-3 border-t border-zinc-800 pt-3">
              <p className="text-xs text-zinc-500 mb-1.5">Tools</p>
              <div className="flex flex-wrap gap-1.5">
                {toolItems.map((t) => (
                  <Badge key={t} variant="outline" className="border-zinc-700 font-mono text-xs text-zinc-400">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {generatedInstallCmd && (
            <div className="mt-3 border-t border-zinc-800 pt-3">
              <p className="text-xs text-zinc-500 mb-1.5">Install Command</p>
              <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-2 py-1.5 font-mono text-xs text-zinc-300">
                <Terminal className="h-3 w-3 shrink-0 text-zinc-500" />
                <code className="truncate">{generatedInstallCmd}</code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
