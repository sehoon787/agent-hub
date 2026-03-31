import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const MUTATING_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"])
const CSRF_EXEMPT = ["/api/auth/", "/api/cron/", "/api/collect"]

export default auth((request) => {
  // CSRF origin check for mutating requests
  if (MUTATING_METHODS.has(request.method)) {
    const isExempt = CSRF_EXEMPT.some((path) =>
      request.nextUrl.pathname.startsWith(path)
    )

    if (!isExempt) {
      const origin = request.headers.get("origin")
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

      if (!origin) {
        return NextResponse.json(
          { error: "Missing Origin header" },
          { status: 403 }
        )
      }
      if (origin !== siteUrl && origin !== request.nextUrl.origin) {
        return NextResponse.json(
          { error: "CSRF origin mismatch" },
          { status: 403 }
        )
      }
    }
  }

  // Auth redirect for protected pages
  const protectedPaths = ["/submit", "/my-submissions", "/favorites"]
  if (protectedPaths.some(p => request.nextUrl.pathname === p) && !request.auth) {
    return NextResponse.redirect(new URL("/signin", request.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/submit", "/my-submissions", "/favorites", "/api/:path*"],
}
