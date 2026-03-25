"use client"

import Image from "next/image"
import { useSession, signIn, signOut } from "next-auth/react"
import { LogIn, LogOut } from "lucide-react"

export function AuthButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-800" />
    )
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        {session.user.image && (
          <Image
            src={session.user.image}
            alt={session.user.name ?? "User"}
            width={28}
            height={28}
            className="h-7 w-7 rounded-full"
          />
        )}
        <span className="hidden text-sm text-zinc-300 sm:inline">
          {session.user.name}
        </span>
        <button
          onClick={() => signOut()}
          className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-100"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
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
