"use client"

import Image from "next/image"
import Link from "next/link"
import { useSession, signIn, signOut } from "next-auth/react"
import { LogIn, LogOut, FileText, Heart } from "lucide-react"
import { useState, useRef, useEffect } from "react"

export function AuthButton() {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (status === "loading") {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-800" />
    )
  }

  if (session?.user) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-zinc-600 transition-all"
          aria-label="User menu"
        >
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "User"}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-medium text-white">
              {(session.user.name ?? "U")[0].toUpperCase()}
            </div>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-950 py-1 shadow-xl z-50">
            <div className="border-b border-zinc-800 px-4 py-3">
              <p className="text-sm font-medium text-zinc-100 truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-zinc-500 truncate">
                {session.user.login ?? session.user.email}
              </p>
            </div>
            <Link
              href="/favorites"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors"
            >
              <Heart className="h-4 w-4 text-zinc-500" />
              My Favorites
            </Link>
            <Link
              href="/my-submissions"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors"
            >
              <FileText className="h-4 w-4 text-zinc-500" />
              My Submissions
            </Link>
            <button
              onClick={() => { setOpen(false); signOut(); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors"
            >
              <LogOut className="h-4 w-4 text-zinc-500" />
              Sign out
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn("github")}
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100"
    >
      <LogIn className="h-4 w-4" />
      <span className="hidden sm:inline">Sign in</span>
    </button>
  )
}
