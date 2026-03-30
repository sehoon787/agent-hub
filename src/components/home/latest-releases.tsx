import Link from 'next/link';
import { Newspaper, ExternalLink } from 'lucide-react';
import newsData from '@/lib/data/news.json';
import type { NewsItem } from '@/lib/types';

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function LatestReleases() {
  const news = (newsData as NewsItem[]).slice(0, 6);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-violet-400" />
          <h3 className="font-semibold text-zinc-100">Latest Releases</h3>
        </div>
        <Link
          href="/releases"
          className="text-xs text-violet-400 hover:text-violet-300"
        >
          View all &rarr;
        </Link>
      </div>

      <div className="mt-3 space-y-0">
        {news.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">
            No releases collected yet. Check back later.
          </p>
        ) : (
          news.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between gap-2 border-b border-zinc-800/50 py-2.5 last:border-0 hover:bg-zinc-800/20"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">{item.repo}</span>
                  <span className="text-xs text-violet-400">{item.tagName}</span>
                </div>
                {item.body && (
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{item.body}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-xs text-zinc-500">{relativeDate(item.publishedAt)}</span>
                <ExternalLink className="h-3 w-3 text-zinc-600" />
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
