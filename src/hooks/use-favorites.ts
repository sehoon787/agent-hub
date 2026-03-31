"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"

export function useFavorites() {
  const { data: session, status } = useSession()
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false)
      return
    }

    async function fetchFavorites() {
      try {
        const res = await fetch("/api/favorites")
        if (res.ok) {
          const data = await res.json()
          setFavorites(new Set(data.slugs))
        }
      } catch {
        // Silently fail — favorites are non-critical
      } finally {
        setLoading(false)
      }
    }

    fetchFavorites()
  }, [status])

  const toggleFavorite = useCallback(async (slug: string) => {
    if (!session?.user) return false

    // Optimistic update
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
      }
      return next
    })

    try {
      const res = await fetch("/api/favorites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      })

      if (!res.ok) {
        // Revert optimistic update
        setFavorites((prev) => {
          const next = new Set(prev)
          if (next.has(slug)) {
            next.delete(slug)
          } else {
            next.add(slug)
          }
          return next
        })
        return false
      }
      return true
    } catch {
      // Revert optimistic update
      setFavorites((prev) => {
        const next = new Set(prev)
        if (next.has(slug)) {
          next.delete(slug)
        } else {
          next.add(slug)
        }
        return next
      })
      return false
    }
  }, [session])

  const isFavorited = useCallback((slug: string) => favorites.has(slug), [favorites])

  return { favorites, loading, toggleFavorite, isFavorited, isAuthenticated: status === "authenticated" }
}
