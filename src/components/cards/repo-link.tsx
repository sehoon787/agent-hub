'use client';

import Link from 'next/link';

export function RepoLink({ repo }: { repo: string }) {
  return (
    <Link
      href={`/agents?repo=${encodeURIComponent(repo)}`}
      className="text-xs text-zinc-500 hover:text-zinc-300 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      @{repo}
    </Link>
  );
}
