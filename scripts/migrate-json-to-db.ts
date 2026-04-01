/**
 * Migrate agents.json data into the Neon PostgreSQL agents table.
 * Run with: npx tsx scripts/migrate-json-to-db.ts
 *
 * Idempotent: uses INSERT ... ON CONFLICT (slug) DO UPDATE
 */

import { readFileSync } from "fs"
import { resolve } from "path"
import { neon } from "@neondatabase/serverless"
import dotenv from "dotenv"

// Load .env.local for DATABASE_URL
dotenv.config({ path: resolve(__dirname, "../.env.local") })

interface Agent {
  slug: string
  name: string
  displayName: string
  description: string
  longDescription?: string
  category: string
  model: string
  platform: string
  source?: string
  author: string
  githubUrl?: string
  installCommand?: string
  capabilities?: string[]
  tools?: string[]
  tags?: string[]
  stars?: number
  forks?: number
  featured?: boolean
  verified?: boolean
  createdAt?: string
  updatedAt?: string
}

const BATCH_SIZE = 50

async function runMigration(sql: ReturnType<typeof neon>) {
  const migrationSql = readFileSync(
    resolve(__dirname, "../src/db/migrations/004-agents-table.sql"),
    "utf-8"
  )
  await sql.unsafe(migrationSql)
  console.log("Migration 004 applied (table created if not exists).")
}

async function insertBatch(
  sql: ReturnType<typeof neon>,
  batch: Agent[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0
  let updated = 0
  let errors = 0

  for (const agent of batch) {
    try {
      const result = await sql`
        INSERT INTO agents (
          slug, name, display_name, description, long_description,
          category, model, platform, source, author,
          github_url, install_command,
          capabilities, tools, tags,
          stars, forks, featured, verified,
          created_at, updated_at
        ) VALUES (
          ${agent.slug},
          ${agent.name},
          ${agent.displayName},
          ${agent.description},
          ${agent.longDescription ?? ""},
          ${agent.category},
          ${agent.model},
          ${agent.platform},
          ${agent.source ?? "community"},
          ${agent.author},
          ${agent.githubUrl ?? ""},
          ${agent.installCommand ?? ""},
          ${agent.capabilities ?? []},
          ${agent.tools ?? []},
          ${agent.tags ?? []},
          ${agent.stars ?? 0},
          ${agent.forks ?? 0},
          ${agent.featured ?? false},
          ${agent.verified ?? false},
          ${agent.createdAt ?? new Date().toISOString()},
          ${agent.updatedAt ?? new Date().toISOString()}
        )
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          long_description = EXCLUDED.long_description,
          category = EXCLUDED.category,
          model = EXCLUDED.model,
          platform = EXCLUDED.platform,
          source = EXCLUDED.source,
          author = EXCLUDED.author,
          github_url = EXCLUDED.github_url,
          install_command = EXCLUDED.install_command,
          capabilities = EXCLUDED.capabilities,
          tools = EXCLUDED.tools,
          tags = EXCLUDED.tags,
          stars = EXCLUDED.stars,
          forks = EXCLUDED.forks,
          featured = EXCLUDED.featured,
          verified = EXCLUDED.verified,
          updated_at = EXCLUDED.updated_at
        RETURNING (xmax = 0) AS is_insert
      `
      if (result[0]?.is_insert) {
        inserted++
      } else {
        updated++
      }
    } catch (err) {
      console.error(`  ERROR inserting slug="${agent.slug}":`, err)
      errors++
    }
  }

  return { inserted, updated, errors }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "ERROR: DATABASE_URL is not set. Ensure .env.local exists with DATABASE_URL."
    )
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)

  // Step 1: Run migration to create table
  await runMigration(sql)

  // Step 2: Load agents.json
  const agentsPath = resolve(__dirname, "../src/lib/data/agents.json")
  const agents: Agent[] = JSON.parse(readFileSync(agentsPath, "utf-8"))
  console.log(`Loaded ${agents.length} agents from agents.json`)

  // Step 3: Batch insert
  let totalInserted = 0
  let totalUpdated = 0
  let totalErrors = 0

  for (let i = 0; i < agents.length; i += BATCH_SIZE) {
    const batch = agents.slice(i, i + BATCH_SIZE)
    const { inserted, updated, errors } = await insertBatch(sql, batch)
    totalInserted += inserted
    totalUpdated += updated
    totalErrors += errors

    const processed = Math.min(i + BATCH_SIZE, agents.length)
    console.log(`  ${processed}/${agents.length} processed`)
  }

  // Step 4: Summary
  console.log("\n--- Migration complete ---")
  console.log(`  Inserted: ${totalInserted}`)
  console.log(`  Updated:  ${totalUpdated}`)
  console.log(`  Errors:   ${totalErrors}`)
  console.log(`  Total:    ${totalInserted + totalUpdated + totalErrors}`)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
