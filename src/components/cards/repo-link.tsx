'use client';

import Link from 'next/link';

export function RepoLink({ owner, repo }: { owner: string; repo: string }) {
  return (
    <Link
      href={`/agents?q=${encodeURIComponent(owner)}`}
      className="text-xs text-zinc-500 hover:text-zinc-300 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      @{repo}
    </Link>
  );
}
