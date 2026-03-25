import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const { url } = await request.json()

  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { valid: false, status: 400, message: "URL is required" },
      { status: 400 }
    )
  }

  // Only verify GitHub URLs
  if (!url.startsWith("https://github.com/")) {
    return NextResponse.json(
      { valid: false, status: 400, message: "Only GitHub URLs are supported" },
      { status: 400 }
    )
  }

  try {
    const token = process.env.GITHUB_TOKEN
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    const res = await fetch(url, { method: "HEAD", headers, redirect: "follow" })

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
