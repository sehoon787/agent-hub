import type { Metadata } from 'next';
import { ExternalLink, Newspaper } from 'lucide-react';
import { getNews } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Latest Releases',
  description: 'Track the latest releases from top AI coding agent repositories — changelogs, updates, and new versions.',
};

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function truncate(text: string, max: number): string {
  if (!text || text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '...';
}

export default function ReleasesPage() {
  const news = getNews();

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <Newspaper className="h-6 w-6 text-violet-400" />
        <h1 className="text-2xl font-bold text-zinc-100">Latest Releases</h1>
      </div>

      {news.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          No releases collected yet. Check back later.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {news.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">{item.repo}</span>
                  <span className="text-xs text-violet-400">{item.tagName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-500">{relativeDate(item.publishedAt)}</span>
                  <ExternalLink className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400" />
                </div>
              </div>

              {item.title && (
                <p className="mt-2 text-sm font-medium text-zinc-100">
                  {item.title}
                </p>
              )}

              {item.body && (
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {truncate(item.body, 200)}
                </p>
              )}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
