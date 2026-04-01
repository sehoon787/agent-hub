/**
 * Verify all agent GitHub URLs in the Neon DB.
 * Sets verified=true for agents with valid, reachable GitHub URLs.
 * Run with: npx tsx scripts/verify-agents.ts
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config({ path: '.env.local' });

interface Agent {
  id: number;
  slug: string;
  display_name: string;
  github_url: string;
  verified: boolean;
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const agents: Agent[] = await sql.query('SELECT id, slug, display_name, github_url, verified FROM agents') as unknown as Agent[];

  const results = { valid: 0, invalid: 0, missing: 0, rateLimit: 0 };

  for (const agent of agents) {
    if (!agent.github_url) {
      results.missing++;
      if (agent.verified) {
        await sql.query('UPDATE agents SET verified = false WHERE id = $1', [agent.id]);
      }
      console.log(`[MISSING] ${agent.display_name} — no GitHub URL`);
      continue;
    }

    try {
      const res = await fetch(agent.github_url, { method: 'HEAD', redirect: 'follow' });
      if (res.status === 429) {
        results.rateLimit++;
        console.log(`[RATE-LIMITED] ${agent.display_name}`);
      } else if (res.ok) {
        results.valid++;
        if (!agent.verified) {
          await sql.query('UPDATE agents SET verified = true WHERE id = $1', [agent.id]);
        }
      } else {
        results.invalid++;
        if (agent.verified) {
          await sql.query('UPDATE agents SET verified = false WHERE id = $1', [agent.id]);
        }
        console.log(`[INVALID ${res.status}] ${agent.display_name}`);
      }
    } catch (err) {
      results.invalid++;
      if (agent.verified) {
        await sql.query('UPDATE agents SET verified = false WHERE id = $1', [agent.id]);
      }
      console.log(`[ERROR] ${agent.display_name} — ${err}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Valid: ${results.valid}`);
  console.log(`Invalid: ${results.invalid}`);
  console.log(`Missing URL: ${results.missing}`);
  console.log(`Rate Limited: ${results.rateLimit}`);
  console.log(`Total: ${agents.length}`);
}

main();
