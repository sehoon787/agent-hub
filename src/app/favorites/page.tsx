import type { Metadata } from 'next';
import { FavoritesList } from './favorites-list';

export const metadata: Metadata = {
  title: 'My Favorites',
  description: 'Your favorite AI coding agents and skills on AgentHub.',
};

export default function FavoritesPage() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-zinc-100">My Favorites</h1>
      <p className="mt-1 text-zinc-400">
        Agents and skills you&apos;ve saved for quick access.
      </p>
      <FavoritesList />
    </div>
  );
}
