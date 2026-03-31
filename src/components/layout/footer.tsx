import Link from 'next/link';
import { Bot } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-violet-500" />
              <span className="font-bold text-zinc-100">AgentHub</span>
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              Discover &amp; share AI coding agents across Claude Code, Gemini CLI,
              and Codex CLI.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Browse</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/agents" className="text-sm text-zinc-400 hover:text-zinc-100">All Agents</Link></li>
              <li><Link href="/agents?category=orchestrator" className="text-sm text-zinc-400 hover:text-zinc-100">Orchestrators</Link></li>
              <li><Link href="/agents?category=specialist" className="text-sm text-zinc-400 hover:text-zinc-100">Specialists</Link></li>
              <li><Link href="/agents?category=worker" className="text-sm text-zinc-400 hover:text-zinc-100">Workers</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Community</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/submit" className="text-sm text-zinc-400 hover:text-zinc-100">Submit Agent</Link></li>
              <li><Link href="/about" className="text-sm text-zinc-400 hover:text-zinc-100">About</Link></li>
              <li><a href="https://github.com/sehoon787/agent-hub" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-zinc-100">GitHub</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Platforms</h3>
            <ul className="mt-3 space-y-2">
              <li><a href="https://github.com/anthropics/claude-code" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-zinc-100">Claude Code</a></li>
              <li><a href="https://github.com/google-gemini/gemini-cli" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-zinc-100">Gemini CLI</a></li>
              <li><a href="https://github.com/openai/codex" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-zinc-100">Codex CLI</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-zinc-800 pt-6 text-center text-sm text-zinc-500">
          &copy; {new Date().getFullYear()} AgentHub. Open source project.
          {' · '}
          <a href="https://github.com/sehoon787/agent-hub" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-100">github.com/sehoon787/agent-hub</a>
        </div>
      </div>
    </footer>
  );
}
