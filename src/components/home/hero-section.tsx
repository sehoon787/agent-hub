import Link from 'next/link';
import { SearchInput } from '@/components/search/search-input';

export function HeroSection() {
  return (
    <section className="pb-16 pt-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl lg:text-6xl">
        <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
          AgentHub
        </span>
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
        Discover &amp; share AI coding agents across Claude Code, Gemini CLI, and Codex CLI. The open-source registry for the multi-platform agent ecosystem.
      </p>
      <div className="mx-auto mt-8 max-w-xl">
        <SearchInput placeholder="Search agents..." />
      </div>
      <div className="mt-6 flex items-center justify-center gap-4">
        <Link
          href="/agents"
          className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          Browse Agents
        </Link>
        <Link
          href="/submit"
          className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Submit Yours
        </Link>
      </div>
    </section>
  );
}
