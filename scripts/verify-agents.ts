/**
 * Verify all agent GitHub URLs in agents.json.
 * Sets verified=true for agents with valid, reachable GitHub URLs.
 * Run with: npx tsx scripts/verify-agents.ts
 */

import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

interface Agent {
  slug: string
  displayName: string
  githubUrl?: string
  verified: boolean
  [key: string]: unknown
}

async function main() {
  const filePath = resolve(__dirname, "../src/lib/data/agents.json")
  const agents: Agent[] = JSON.parse(readFileSync(filePath, "utf-8"))

  const results = { valid: 0, invalid: 0, missing: 0, rateLimit: 0 }
  let changed = false

  for (const agent of agents) {
    if (!agent.githubUrl) {
      results.missing++
      if (agent.verified) {
        agent.verified = false
        changed = true
      }
      console.log(`[MISSING] ${agent.displayName} — no GitHub URL`)
      continue
    }

    try {
      const res = await fetch(agent.githubUrl, { method: "HEAD", redirect: "follow" })
      if (res.status === 429) {
        results.rateLimit++
        console.log(`[RATE-LIMITED] ${agent.displayName} — ${agent.githubUrl}`)
      } else if (res.ok) {
        results.valid++
        if (!agent.verified) {
          agent.verified = true
          changed = true
        }
        console.log(`[VALID] ${agent.displayName} — ${agent.githubUrl}`)
      } else {
        results.invalid++
        if (agent.verified) {
          agent.verified = false
          changed = true
        }
        console.log(`[INVALID ${res.status}] ${agent.displayName} — ${agent.githubUrl}`)
      }
    } catch (err) {
      results.invalid++
      if (agent.verified) {
        agent.verified = false
        changed = true
      }
      console.log(`[ERROR] ${agent.displayName} — ${agent.githubUrl} — ${err}`)
    }
  }

  if (changed) {
    writeFileSync(filePath, JSON.stringify(agents, null, 2) + "\n")
    console.log("\n[UPDATED] agents.json written with verified status changes")
  }

  console.log("\n--- Summary ---")
  console.log(`Valid: ${results.valid}`)
  console.log(`Invalid: ${results.invalid}`)
  console.log(`Missing URL: ${results.missing}`)
  console.log(`Rate Limited: ${results.rateLimit}`)
  console.log(`Total: ${agents.length}`)
}

main()
