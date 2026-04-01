/**
 * Verify all agent GitHub URLs and file quality in the Neon DB.
 * Sets verified=true for agents with valid, reachable, well-formed, secure files.
 * Run with: npx tsx scripts/verify-agents.ts
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config({ path: '.env.local' });

// Same patterns as src/lib/security.ts — keep in sync
const MALICIOUS_PATTERNS = [
  /eval\s*\(/i,
  /exec\s*\(/i,
  /child_process/i,
  /require\s*\(\s*['"]fs['"]\s*\)/i,
  /import\s+.*from\s+['"]child_process['"]/i,
  /process\.env/i,
  /\bsudo\b/i,
  /rm\s+-rf/i,
  /curl\s+.*\|\s*sh/i,
  /wget\s+.*\|\s*sh/i,
  /<script\b/i,
  /javascript:/i,
  /on(error|load|click)\s*=/i,
  /dangerouslySetInnerHTML/i,
  /\.exec\s*\(/i,
  /spawn\s*\(/i,
  /\bFetch\s*\(\s*['"]file:/i,
  /data:/i,
  /vbscript:/i,
  /<svg\b/i,
  /<iframe\b/i,
  /expression\s*\(/i,
  /\$\{/,
  /\{\{/,
];

interface Agent {
  id: number;
  slug: string;
  display_name: string;
  github_url: string;
  verified: boolean;
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const agents: Agent[] = await sql.query(
    'SELECT id, slug, display_name, github_url, verified FROM agents'
  ) as unknown as Agent[];

  const results = { verified: 0, failed: 0, missing: 0, rateLimit: 0, nonBlob: 0 };

  for (const agent of agents) {
    // Step 0: No URL
    if (!agent.github_url) {
      results.missing++;
      if (agent.verified) {
        await sql.query('UPDATE agents SET verified = false WHERE id = $1', [agent.id]);
      }
      continue;
    }

    // Step 1: URL reachability
    try {
      const headRes = await fetch(agent.github_url, { method: 'HEAD', redirect: 'follow' });
      if (headRes.status === 429) {
        results.rateLimit++;
        console.log(`[RATE-LIMITED] ${agent.slug}`);
        continue; // Don't change status
      }
      if (!headRes.ok) {
        results.failed++;
        if (agent.verified) {
          await sql.query('UPDATE agents SET verified = false WHERE id = $1', [agent.id]);
        }
        console.log(`[FAIL:URL ${headRes.status}] ${agent.slug}`);
        continue;
      }
    } catch (err) {
      results.failed++;
      if (agent.verified) {
        await sql.query('UPDATE agents SET verified = false WHERE id = $1', [agent.id]);
      }
      console.log(`[FAIL:NETWORK] ${agent.slug} — ${err}`);
      continue;
    }

    // Step 2-4: File content checks (only for /blob/ URLs)
    const blobMatch = agent.github_url.match(/github\.com\/([^/]+\/[^/]+)\/blob\/([^/]+)\/(.+)/);
    if (!blobMatch) {
      // Non-blob URL (repo-level) — URL is reachable but can't verify file content
      results.nonBlob++;
      if (agent.verified) {
        await sql.query('UPDATE agents SET verified = false WHERE id = $1', [agent.id]);
      }
      continue;
    }

    const rawUrl = `https://raw.githubusercontent.com/${blobMatch[1]}/${blobMatch[2]}/${blobMatch[3]}`;
    let content: string;
    try {
      const fileRes = await fetch(rawUrl);
      if (!fileRes.ok) {
        results.failed++;
        if (agent.verified) {
          await sql.query('UPDATE agents SET verified = false WHERE id = $1', [agent.id]);
        }
        console.log(`[FAIL:RAW ${fileRes.status}] ${agent.slug}`);
        continue;
      }
      content = await fileRes.text();
    } catch (err) {
      results.failed++;
      if (agent.verified) {
        await sql.query('UPDATE agents SET verified = false WHERE id = $1', [agent.id]);
      }
      console.log(`[FAIL:FETCH] ${agent.slug} — ${err}`);
      continue;
    }

    // Step 2: File size and emptiness
    if (!content.trim() || content.length > 100000) {
      results.failed++;
      if (agent.verified) {
        await sql.query('UPDATE agents SET verified = false WHERE id = $1', [agent.id]);
      }
      console.log(`[FAIL:SIZE] ${agent.slug} — ${content.length > 100000 ? '>100KB' : 'empty'}`);
      continue;
    }

    // Step 3: Format validation
    const hasFrontmatter = /^---\s*\n[\s\S]*?\n---/.test(content);
    const hasHeading = /^#\s+.+/m.test(content);
    if (!hasFrontmatter && !hasHeading) {
      results.failed++;
      if (agent.verified) {
        await sql.query('UPDATE agents SET verified = false WHERE id = $1', [agent.id]);
      }
      console.log(`[FAIL:FORMAT] ${agent.slug} — no frontmatter or heading`);
      continue;
    }

    // Step 4: Security check
    const issues: string[] = [];
    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(content)) {
        issues.push(pattern.source);
      }
    }
    if (issues.length > 0) {
      results.failed++;
      if (agent.verified) {
        await sql.query('UPDATE agents SET verified = false WHERE id = $1', [agent.id]);
      }
      console.log(`[FAIL:SECURITY] ${agent.slug} — ${issues.join(', ')}`);
      continue;
    }

    // All checks passed
    results.verified++;
    if (!agent.verified) {
      await sql.query('UPDATE agents SET verified = true WHERE id = $1', [agent.id]);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Verified: ${results.verified}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Missing URL: ${results.missing}`);
  console.log(`Non-blob URL: ${results.nonBlob}`);
  console.log(`Rate Limited: ${results.rateLimit}`);
  console.log(`Total: ${agents.length}`);
}

main();
