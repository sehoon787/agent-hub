/**
 * Enrich agents in agents.json with inferred capabilities and tools.
 * Only fills in EMPTY arrays — never overwrites existing non-empty data.
 * Run with: npx tsx scripts/enrich-agents.ts
 */

import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

interface Agent {
  slug: string
  displayName: string
  description: string
  category: string
  capabilities: string[]
  tools: string[]
  tags?: string[]
  [key: string]: unknown
}

// --- Capabilities rules ---

const CATEGORY_CAPABILITIES: Record<string, string[]> = {
  orchestrator: ["Task orchestration", "Agent coordination", "Workflow management"],
  specialist: ["Domain expertise", "Specialized analysis"],
  worker: ["Task execution", "Code generation"],
  analyst: ["Analysis", "Research", "Reporting"],
}

const DESCRIPTION_CAPABILITY_RULES: Array<[RegExp, string]> = [
  [/\breview/i, "Code review"],
  [/\btest/i, "Testing"],
  [/\bdebug/i, "Debugging"],
  [/\bsecurity/i, "Security analysis"],
  [/\bdeploy/i, "Deployment"],
  [/\bdoc/i, "Documentation"],
  [/\brefactor/i, "Refactoring"],
  [/\bplan\b|\barchitect/i, "Architecture planning"],
  [/\bgit\b/i, "Git operations"],
  [/\bperformance/i, "Performance optimization"],
  [/\bdesign/i, "Design"],
  [/\bdata/i, "Data processing"],
  [/\bmonitor/i, "Monitoring"],
  [/\bAPI/i, "API development"],
]

function inferCapabilities(agent: Agent): string[] {
  const caps: string[] = []

  const fromCategory = CATEGORY_CAPABILITIES[agent.category]
  if (fromCategory) {
    caps.push(...fromCategory)
  }

  for (const [pattern, capability] of DESCRIPTION_CAPABILITY_RULES) {
    if (pattern.test(agent.description)) {
      caps.push(capability)
    }
  }

  // Deduplicate
  return [...new Set(caps)]
}

// --- Tools rules ---

const DESCRIPTION_TOOL_RULES: Array<[RegExp, string[]]> = [
  [/\bread\b|\bsearch\b|\bexplor|\bscan\b/i, ["Read", "Grep", "Glob"]],
  [/\bwrit|\bcreat|\bimplement|\bbuild\b|\bgenerat/i, ["Read", "Write", "Edit"]],
  [/\bexecut|\bbash\b|\bcommand\b|\brun\b|\btest/i, ["Bash"]],
  [/\bweb\b|\bfetch\b|\bhttp\b|\burl\b|\bapi\b/i, ["WebFetch", "WebSearch"]],
  [/\bagent\b|\borchestrat|\bdelegat/i, ["Agent"]],
]

function inferTools(agent: Agent): string[] {
  const tools: string[] = []

  for (const [pattern, addTools] of DESCRIPTION_TOOL_RULES) {
    if (pattern.test(agent.description)) {
      tools.push(...addTools)
    }
  }

  if (agent.category === "orchestrator" && tools.length === 0) {
    return ["Read", "Grep", "Glob", "Write", "Edit", "Bash", "Agent"]
  }

  if (tools.length === 0) {
    return ["Read", "Grep", "Glob", "Write", "Edit", "Bash"]
  }

  // Deduplicate
  return [...new Set(tools)]
}

// --- Main ---

function main() {
  const filePath = resolve(__dirname, "../src/lib/data/agents.json")
  const agents: Agent[] = JSON.parse(readFileSync(filePath, "utf-8"))

  const total = agents.length
  const beforeEmptyCapabilities = agents.filter(a => a.capabilities.length === 0).length
  const beforeEmptyTools = agents.filter(a => a.tools.length === 0).length

  let enrichedCapabilities = 0
  let enrichedTools = 0

  for (const agent of agents) {
    if (agent.capabilities.length === 0) {
      agent.capabilities = inferCapabilities(agent)
      enrichedCapabilities++
    }

    if (agent.tools.length === 0) {
      agent.tools = inferTools(agent)
      enrichedTools++
    }
  }

  writeFileSync(filePath, JSON.stringify(agents, null, 2) + "\n")

  const afterEmptyCapabilities = agents.filter(a => a.capabilities.length === 0).length
  const afterEmptyTools = agents.filter(a => a.tools.length === 0).length

  const pct = (n: number) => ((n / total) * 100).toFixed(1)

  console.log("\n--- Enrichment Complete ---")
  console.log(`Total agents: ${total}`)
  console.log(`\nCapabilities:`)
  console.log(`  Enriched: ${enrichedCapabilities} agents`)
  console.log(`  Empty before: ${beforeEmptyCapabilities} (${pct(beforeEmptyCapabilities)}%)`)
  console.log(`  Empty after:  ${afterEmptyCapabilities} (${pct(afterEmptyCapabilities)}%)`)
  console.log(`\nTools:`)
  console.log(`  Enriched: ${enrichedTools} agents`)
  console.log(`  Empty before: ${beforeEmptyTools} (${pct(beforeEmptyTools)}%)`)
  console.log(`  Empty after:  ${afterEmptyTools} (${pct(afterEmptyTools)}%)`)
}

main()
