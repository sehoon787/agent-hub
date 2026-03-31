import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"

// GET /api/favorites — returns all favorite slugs for the current user
export const GET = auth(async function GET(req) {
  if (!req.auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const login = (req.auth.user as { login?: string }).login
  if (!login) {
    return NextResponse.json({ error: "Missing login" }, { status: 400 })
  }

  try {
    const sql = getDb()
    const rows = await sql`
      SELECT f.agent_slug FROM favorites f
      JOIN users u ON f.user_id = u.id
      WHERE u.login = ${login}
      ORDER BY f.created_at DESC
    `
    const slugs = rows.map((r) => r.agent_slug as string)
    return NextResponse.json({ slugs })
  } catch (e) {
    console.error("Failed to fetch favorites:", e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}) as unknown as (req: Request) => Promise<Response>

// PUT /api/favorites — toggle a favorite (add/remove)
export const PUT = auth(async function PUT(req) {
  if (!req.auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const login = (req.auth.user as { login?: string }).login
  if (!login) {
    return NextResponse.json({ error: "Missing login" }, { status: 400 })
  }

  let body: { slug?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { slug } = body
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 })
  }

  try {
    const sql = getDb()

    // Get user id
    const users = await sql`SELECT id FROM users WHERE login = ${login}`
    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const userId = users[0].id

    // Check if already favorited
    const existing = await sql`
      SELECT id FROM favorites WHERE user_id = ${userId} AND agent_slug = ${slug}
    `

    if (existing.length > 0) {
      // Remove
      await sql`DELETE FROM favorites WHERE user_id = ${userId} AND agent_slug = ${slug}`
      return NextResponse.json({ favorited: false })
    } else {
      // Add
      await sql`INSERT INTO favorites (user_id, agent_slug) VALUES (${userId}, ${slug})`
      return NextResponse.json({ favorited: true })
    }
  } catch (e) {
    console.error("Failed to toggle favorite:", e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}) as unknown as (req: Request) => Promise<Response>
