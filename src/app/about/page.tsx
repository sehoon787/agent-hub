import type { Metadata } from 'next';
import { Bot, Users, Wrench, Eye, GitBranch, Search, RefreshCw, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about AgentHub — the open-source registry for AI coding agents across Claude Code, Gemini CLI, and Codex CLI.',
};

export default function AboutPage() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-zinc-100">About AgentHub</h1>
      <p className="mt-2 max-w-3xl text-zinc-400">
        AgentHub is the open-source registry for discovering and sharing AI coding agents across
        multiple platforms — Claude Code, Gemini CLI, and OpenAI Codex CLI. Like{' '}
        <a href="https://smithery.ai" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
          Smithery
        </a>{' '}
        for MCP servers, AgentHub helps developers discover, share, and collect agents for their
        AI-powered development workflows.
      </p>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-zinc-100">What is AgentHub?</h2>
        <p className="mt-2 text-sm text-zinc-400">
          AgentHub is a centralized registry where developers can browse, search, and install AI
          coding agents. Agents are autonomous AI-powered assistants that can plan, execute, and
          verify development tasks within CLI-based coding tools. They range from high-level
          orchestrators to focused specialist workers.
        </p>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-zinc-100">Supported Platforms</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
            <h3 className="font-semibold text-amber-300">Claude Code</h3>
            <p className="mt-1 text-sm text-zinc-400">
              {"Anthropic's CLI coding agent. Agents are defined as .md files in .claude/agents/ directories."}
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5">
            <h3 className="font-semibold text-blue-300">Gemini CLI</h3>
            <p className="mt-1 text-sm text-zinc-400">
              {"Google's CLI coding agent. Agents are defined as .md files in .gemini/agents/ directories."}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <h3 className="font-semibold text-emerald-300">Codex CLI</h3>
            <p className="mt-1 text-sm text-zinc-400">
              {"OpenAI's CLI coding agent. Agents are defined as .toml files in .codex/agents/ directories."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-zinc-100">Agent Categories</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <Users className="h-8 w-8 text-violet-400" />
            <h3 className="mt-3 text-lg font-semibold text-zinc-100">Orchestrators</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Meta-agents that coordinate multi-agent workflows, classify intent, route to optimal models,
              and delegate to specialized sub-agents. They manage the big picture.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <Wrench className="h-8 w-8 text-blue-400" />
            <h3 className="mt-3 text-lg font-semibold text-zinc-100">Specialists</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Domain experts with deep knowledge in specific areas like security, architecture, testing,
              or code review. They provide expert-level analysis and recommendations.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <Bot className="h-8 w-8 text-emerald-400" />
            <h3 className="mt-3 text-lg font-semibold text-zinc-100">Workers</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Focused executors that handle implementation, code generation, refactoring, and other
              hands-on development tasks. They build and ship.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <Eye className="h-8 w-8 text-amber-400" />
            <h3 className="mt-3 text-lg font-semibold text-zinc-100">Analysts</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Read-only advisors that provide strategic counsel, code review, performance analysis,
              and architectural guidance without making changes.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-zinc-100">Cross-Platform Compatibility</h2>
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <Globe className="h-8 w-8 text-purple-400" />
          <h3 className="mt-3 text-lg font-semibold text-zinc-100">SKILL.md Open Standard</h3>
          <p className="mt-2 text-sm text-zinc-400">
            SKILL.md is a shared open standard adopted across Claude Code, Gemini CLI, and Codex CLI.
            It defines a portable format for agent skills that can work across all three platforms,
            enabling a unified ecosystem of reusable AI coding capabilities.
          </p>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-zinc-100">Model Tiers</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-5">
            <h3 className="font-semibold text-violet-300">Opus</h3>
            <p className="mt-1 text-sm text-zinc-400">Deep reasoning, complex architecture, multi-step planning</p>
          </div>
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5">
            <h3 className="font-semibold text-blue-300">Sonnet</h3>
            <p className="mt-1 text-sm text-zinc-400">Balanced coding, orchestration, most development tasks</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <h3 className="font-semibold text-emerald-300">Haiku</h3>
            <p className="mt-1 text-sm text-zinc-400">Fast and light, frequent invocation, worker agents</p>
          </div>
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-semibold text-zinc-100">How Auto-Collection Works</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div className="flex gap-4">
            <Search className="mt-1 h-6 w-6 shrink-0 text-violet-400" />
            <div>
              <h3 className="font-semibold text-zinc-100">1. Discover</h3>
              <p className="mt-1 text-sm text-zinc-400">
                The collector scans known GitHub repositories for agent definition files across all supported platforms.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <GitBranch className="mt-1 h-6 w-6 shrink-0 text-violet-400" />
            <div>
              <h3 className="font-semibold text-zinc-100">2. Parse</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Markdown frontmatter and TOML configs are extracted and normalized into a consistent data model with
                descriptions, capabilities, and install commands.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <RefreshCw className="mt-1 h-6 w-6 shrink-0 text-violet-400" />
            <div>
              <h3 className="font-semibold text-zinc-100">3. Merge</h3>
              <p className="mt-1 text-sm text-zinc-400">
                New entries are merged with the existing registry, deduplicating by slug. The collection
                can be triggered manually or via scheduled cron jobs.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-semibold text-zinc-100">How to Contribute</h2>
        <div className="mt-4 space-y-4 text-sm text-zinc-400">
          <p>There are several ways to contribute to AgentHub:</p>
          <ul className="list-inside list-disc space-y-2">
            <li>
              <strong className="text-zinc-200">Submit via the form</strong> — Use the{' '}
              <a href="/submit" className="text-violet-400 hover:underline">Submit page</a> to add your
              agent directly.
            </li>
            <li>
              <strong className="text-zinc-200">Open a Pull Request</strong> — Add entries to the JSON
              data files and submit a PR on GitHub.
            </li>
            <li>
              <strong className="text-zinc-200">Report Issues</strong> — Found a bug or have a feature
              request? Open an issue on the GitHub repository.
            </li>
            <li>
              <strong className="text-zinc-200">Improve the Platform</strong> — The entire application
              is open source. Contributions to the codebase are welcome.
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-semibold text-zinc-100">Tech Stack</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            'Next.js 15',
            'TypeScript',
            'Tailwind CSS v4',
            'shadcn/ui',
            'Lucide Icons',
            'Supabase',
            'Auth.js v5',
            'Vercel',
          ].map((tech) => (
            <span
              key={tech}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-semibold text-zinc-100">References</h2>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <a href="https://github.com/anthropics/claude-code" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
              Claude Code
            </a>{' '}
            <span className="text-zinc-500">-- Official Claude Code CLI by Anthropic</span>
          </li>
          <li>
            <a href="https://github.com/google-gemini/gemini-cli" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
              Gemini CLI
            </a>{' '}
            <span className="text-zinc-500">-- Official Gemini CLI by Google</span>
          </li>
          <li>
            <a href="https://github.com/openai/codex" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
              Codex CLI
            </a>{' '}
            <span className="text-zinc-500">-- Official Codex CLI by OpenAI</span>
          </li>
          <li>
            <a href="https://github.com/Yeachan-Heo/oh-my-claudecode" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
              Oh My Claude Code
            </a>{' '}
            <span className="text-zinc-500">-- Agent and plugin ecosystem for Claude Code</span>
          </li>
          <li>
            <a href="https://github.com/josstei/maestro-gemini" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
              Maestro Gemini
            </a>{' '}
            <span className="text-zinc-500">-- Multi-agent orchestration for Gemini CLI</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
