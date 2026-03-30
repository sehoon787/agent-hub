import type { Metadata } from 'next';
import { Newspaper } from 'lucide-react';
import { getNewsPaginated } from '@/lib/data';
import { Pagination } from '@/components/ui/pagination';

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

const ITEMS_PER_PAGE = 12;

export default async function ReleasesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const { items, total } = getNewsPaginated({ page, limit: ITEMS_PER_PAGE });
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <Newspaper className="h-6 w-6 text-violet-400" />
        <h1 className="text-2xl font-bold text-zinc-100">
          Latest Releases{' '}
          <span className="text-lg font-normal text-zinc-400">({total})</span>
        </h1>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          No releases collected yet. Check back later.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          {/* Header */}
          <div className="grid grid-cols-[3rem_1fr_2fr_5rem_4.5rem] gap-2 border-b border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <span>#</span>
            <span>Repository</span>
            <span>Title</span>
            <span>Tag</span>
            <span className="text-right">Date</span>
          </div>

          {/* Rows */}
          {items.map((item, idx) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="grid grid-cols-[3rem_1fr_2fr_5rem_4.5rem] items-center gap-2 border-b border-zinc-800 px-4 py-3 transition-colors last:border-b-0 hover:bg-zinc-800/50"
            >
              <span className="text-sm text-zinc-500">
                {(safePage - 1) * ITEMS_PER_PAGE + idx + 1}
              </span>
              <span className="truncate text-sm font-medium text-violet-400">
                {item.repo}
              </span>
              <span className="truncate text-sm text-zinc-200">
                {item.title || 'Untitled'}
              </span>
              <span className="inline-flex w-fit items-center rounded-md bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-zinc-300">
                {item.tagName}
              </span>
              <span className="text-right text-xs text-zinc-500">
                {relativeDate(item.publishedAt)}
              </span>
            </a>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-6">
        <Pagination currentPage={safePage} totalPages={totalPages} baseUrl="/releases" />
      </div>
    </section>
  );
}
