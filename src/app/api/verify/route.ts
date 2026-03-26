import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/[a-zA-Z0-9_.-]+)?$/

export async function POST(request: NextRequest) {
  // Auth check
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { valid: false, status: 401, message: "Authentication required" },
      { status: 401 }
    )
  }

  // Rate limit
  const ip = getClientIp(request)
  const { allowed, remaining } = rateLimit(`verify:${ip}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { valid: false, status: 429, message: "Too many requests" },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
    )
  }

  const { url } = await request.json()

  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { valid: false, status: 400, message: "URL is required" },
      { status: 400 }
    )
  }

  // Strict URL pattern: only allow github.com/owner/repo with optional one extra segment
  if (!GITHUB_URL_PATTERN.test(url)) {
    return NextResponse.json(
      { valid: false, status: 400, message: "Only GitHub repository URLs are supported (no query params)" },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { Accept: "application/vnd.github.v3+json" },
      redirect: "follow",
    })

    return NextResponse.json({
      valid: res.ok,
      status: res.status,
      message: res.ok ? "URL is valid" : `URL returned ${res.status}`,
    })
  } catch {
    return NextResponse.json(
      { valid: false, status: 500, message: "Failed to verify URL" },
      { status: 500 }
    )
  }
}
