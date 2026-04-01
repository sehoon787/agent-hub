"use client"

import { Heart } from "lucide-react"
import { useSession, signIn } from "next-auth/react"
import { useFavorites } from "@/hooks/use-favorites"

interface FavoriteButtonProps {
  slug: string
  compact?: boolean
  size?: "sm" | "lg"
}

export function FavoriteButton({ slug, compact, size = "sm" }: FavoriteButtonProps) {
  const { status } = useSession()
  const { isFavorited, toggleFavorite } = useFavorites()

  const favorited = isFavorited(slug)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (status !== "authenticated") {
      signIn("github")
      return
    }

    await toggleFavorite(slug)
  }

  return (
    <button
      onClick={handleClick}
      className={`group/fav inline-flex items-center gap-1 rounded-md transition-colors ${
        compact
          ? "p-1.5 hover:bg-zinc-800"
          : "border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-sm hover:bg-zinc-800"
      }`}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`${size === "lg" ? "h-8 w-8" : "h-4 w-4"} transition-colors ${
          favorited
            ? "fill-red-500 text-red-500"
            : "text-zinc-500 group-hover/fav:text-red-400"
        }`}
      />
      {!compact && (
        <span className="text-zinc-400">
          {favorited ? "Favorited" : "Favorite"}
        </span>
      )}
    </button>
  )
}
