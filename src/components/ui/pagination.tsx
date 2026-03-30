'use client';

import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Client-side mode: called when user selects a page */
  onPageChange?: (page: number) => void;
  /** Server-side mode: base URL; page appended as ?page=N */
  baseUrl?: string;
}

function getPageWindow(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];

  const showLeftEllipsis = current > 3;
  const showRightEllipsis = current < total - 2;

  if (showLeftEllipsis) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (showRightEllipsis) pages.push('...');

  pages.push(total);
  return pages;
}

const BASE_BTN = 'flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm transition-colors';
const ACTIVE_BTN = `${BASE_BTN} bg-violet-600 text-white font-medium`;
const IDLE_BTN = `${BASE_BTN} bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100`;
const DISABLED_BTN = `${BASE_BTN} bg-zinc-900 text-zinc-600 cursor-default`;

export function Pagination({ currentPage, totalPages, onPageChange, baseUrl }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageWindow = getPageWindow(currentPage, totalPages);

  function href(page: number) {
    if (!baseUrl) return '#';
    const url = new URL(baseUrl, 'http://x');
    url.searchParams.set('page', String(page));
    return url.pathname + (url.search || '');
  }

  function PageItem({ page }: { page: number | '...' }) {
    if (page === '...') {
      return <span className={`${BASE_BTN} text-zinc-500 cursor-default`}>…</span>;
    }

    const isActive = page === currentPage;

    if (onPageChange) {
      return (
        <button
          onClick={() => !isActive && onPageChange(page)}
          disabled={isActive}
          className={isActive ? ACTIVE_BTN : IDLE_BTN}
        >
          {page}
        </button>
      );
    }

    return (
      <Link href={href(page)} className={isActive ? ACTIVE_BTN : IDLE_BTN}>
        {page}
      </Link>
    );
  }

  function NavBtn({ page, label }: { page: number; label: string }) {
    const disabled = page < 1 || page > totalPages;
    if (disabled) return <span className={DISABLED_BTN}>{label}</span>;
    if (onPageChange) {
      return <button onClick={() => onPageChange(page)} className={IDLE_BTN}>{label}</button>;
    }
    return <Link href={href(page)} className={IDLE_BTN}>{label}</Link>;
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      <NavBtn page={currentPage - 1} label="←" />
      {pageWindow.map((p, i) => <PageItem key={i} page={p} />)}
      <NavBtn page={currentPage + 1} label="→" />
    </div>
  );
}
