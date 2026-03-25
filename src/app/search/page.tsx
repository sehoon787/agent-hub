import type { Metadata } from 'next';
import { SearchResults } from './search-results';

export const metadata: Metadata = {
  title: 'Search Results',
  description: 'Search AI coding agents on AgentHub.',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <SearchResults query={q ?? ''} />;
}
