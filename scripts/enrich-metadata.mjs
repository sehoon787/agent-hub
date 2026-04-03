#!/usr/bin/env node
// scripts/enrich-metadata.mjs
// Enriches agent/skill metadata by fetching and parsing their markdown source files.
// Usage: node scripts/enrich-metadata.mjs [--repo owner/repo] [--dry-run]

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const repoIdx = args.indexOf('--repo');
const repoFilter = repoIdx !== -1 ? args[repoIdx + 1] : null;

// Extract raw URL from install_command or github_url
function getRawUrl(row) {
  // Try install_command first (has raw.githubusercontent.com URL)
  if (row.install_command) {
    const match = row.install_command.match(/https:\/\/raw\.githubusercontent\.com\/[^\s]+/);
    if (match) return match[0];
  }
  // Fall back to github_url → convert to raw URL
  if (row.github_url) {
    const m = row.github_url.match(/github\.com\/([^/]+\/[^/]+)\/blob\/([^/]+)\/(.+)/);
    if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
  }
  return null;
}

// Parse YAML frontmatter from markdown
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const yaml = match[1];
  const result = {};

  // Simple YAML parser for key: value and key:\n  - item lists
  let currentKey = null;
  let currentList = null;

  for (const line of yaml.split('\n')) {
    const listMatch = line.match(/^\s+-\s+(.+)/);
    const kvMatch = line.match(/^([a-zA-Z_]+):\s*(.*)/);
    const multilineMatch = line.match(/^([a-zA-Z_]+):\s*>\s*$/);

    if (listMatch && currentKey) {
      if (!currentList) currentList = [];
      currentList.push(listMatch[1].trim());
    } else if (multilineMatch) {
      currentKey = multilineMatch[1];
      currentList = null;
    } else if (kvMatch) {
      // Save previous list
      if (currentKey && currentList) {
        result[currentKey] = currentList;
      }
      currentKey = kvMatch[1];
      currentList = null;
      const val = kvMatch[2].trim();
      if (val) {
        result[currentKey] = val.replace(/^["']|["']$/g, '');
      }
    } else if (currentKey && !currentList && line.trim()) {
      // Continuation of multiline value
      result[currentKey] = ((result[currentKey] || '') + ' ' + line.trim()).trim();
    }
  }
  // Save last list
  if (currentKey && currentList) {
    result[currentKey] = currentList;
  }

  return result;
}

// Extract meaningful description from markdown body
function extractDescription(content) {
  // Remove frontmatter
  const body = content.replace(/^---[\s\S]*?---\r?\n?/, '').trim();
  // Skip headings, find first paragraph with substance
  const lines = body.split('\n');
  let paragraph = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (paragraph.length > 30) break;
      continue;
    }
    if (trimmed.startsWith('#')) {
      if (paragraph.length > 30) break;
      paragraph = '';
      continue;
    }
    if (trimmed.startsWith('```') || trimmed.startsWith('|') || trimmed.startsWith('-')) continue;
    paragraph += (paragraph ? ' ' : '') + trimmed;
  }
  return paragraph.slice(0, 500) || '';
}

// Extract capabilities from markdown sections
function extractCapabilities(content) {
  const caps = [];
  // Look for ## Capabilities or ## Features sections
  const match = content.match(/##\s*(Capabilities|Features|What it does)\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i);
  if (match) {
    const section = match[2];
    for (const line of section.split('\n')) {
      const item = line.match(/^[-*]\s+(.+)/);
      if (item) caps.push(item[1].trim().slice(0, 200));
    }
  }
  return caps.slice(0, 15);
}

// Extract tools from markdown
function extractTools(content) {
  const tools = [];
  const match = content.match(/##\s*(Tools|Available Tools)\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i);
  if (match) {
    const section = match[2];
    for (const line of section.split('\n')) {
      const item = line.match(/^[-*]\s+(?:\*\*)?([A-Za-z][A-Za-z0-9_-]*)(?:\*\*)?/);
      if (item) tools.push(item[1]);
    }
  }
  // Also check frontmatter-style "tools:" in body
  const fmTools = content.match(/^tools:\s*\n((?:\s+-\s+.+\n?)+)/m);
  if (fmTools) {
    for (const line of fmTools[1].split('\n')) {
      const item = line.match(/^\s+-\s+(.+)/);
      if (item && !tools.includes(item[1].trim())) tools.push(item[1].trim());
    }
  }
  return tools.slice(0, 20);
}

// Detect cross-references to other agents/skills
function extractCrossRefs(content, allSlugs) {
  const refs = [];
  const lower = content.toLowerCase();
  for (const slug of allSlugs) {
    if (slug.length < 3) continue;
    if (lower.includes(slug.replace(/-/g, ' ')) || lower.includes(slug)) {
      refs.push(`works-with:${slug}`);
    }
  }
  return refs.slice(0, 10);
}

async function main() {
  console.log(`Enrichment script started${dryRun ? ' (DRY RUN)' : ''}`);
  if (repoFilter) console.log(`Filtering to repo: ${repoFilter}`);

  // Fetch items that need enrichment
  let rows;
  if (repoFilter) {
    const pattern = `%${repoFilter}%`;
    rows = await sql`
      SELECT id, slug, type, name, display_name, description, long_description,
             capabilities, tools, tags, install_command, github_url
      FROM agents
      WHERE (
        description IS NULL OR description = '' OR description = name
        OR array_length(capabilities, 1) IS NULL
        OR array_length(tools, 1) IS NULL
      )
      AND github_url LIKE ${pattern}
      ORDER BY id
    `;
  } else {
    rows = await sql`
      SELECT id, slug, type, name, display_name, description, long_description,
             capabilities, tools, tags, install_command, github_url
      FROM agents
      WHERE (
        description IS NULL OR description = '' OR description = name
        OR array_length(capabilities, 1) IS NULL
        OR array_length(tools, 1) IS NULL
      )
      ORDER BY id
    `;
  }
  console.log(`Found ${rows.length} items to enrich`);

  // Get all slugs for cross-reference detection
  const allSlugsResult = await sql`SELECT slug FROM agents`;
  const allSlugs = allSlugsResult.map(r => r.slug);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const rawUrl = getRawUrl(row);
    if (!rawUrl) {
      skipped++;
      continue;
    }

    try {
      const res = await fetch(rawUrl);
      if (!res.ok) {
        console.log(`  SKIP ${row.slug}: HTTP ${res.status}`);
        skipped++;
        continue;
      }
      const content = await res.text();

      // Parse frontmatter
      const fm = parseFrontmatter(content);

      // Build enriched fields
      const newDesc = (!row.description || row.description === row.name || row.description.length < 20)
        ? (fm.description || extractDescription(content) || row.description)
        : row.description;

      const fmCaps = Array.isArray(fm.capabilities) ? fm.capabilities : [];
      const bodyCaps = extractCapabilities(content);
      const newCaps = (row.capabilities?.length > 0) ? row.capabilities : (fmCaps.length > 0 ? fmCaps : bodyCaps);

      const fmTools = Array.isArray(fm.tools) ? fm.tools : [];
      const bodyTools = extractTools(content);
      const newTools = (row.tools?.length > 0) ? row.tools : (fmTools.length > 0 ? fmTools : bodyTools);

      const crossRefs = extractCrossRefs(content, allSlugs.filter(s => s !== row.slug));
      const existingTags = row.tags || [];
      const newTags = [...new Set([...existingTags, ...crossRefs])].slice(0, 20);

      // Check if anything changed
      const descChanged = newDesc !== row.description;
      const capsChanged = JSON.stringify(newCaps) !== JSON.stringify(row.capabilities);
      const toolsChanged = JSON.stringify(newTools) !== JSON.stringify(row.tools);
      const tagsChanged = JSON.stringify(newTags) !== JSON.stringify(existingTags);

      if (!descChanged && !capsChanged && !toolsChanged && !tagsChanged) {
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log(`  WOULD UPDATE ${row.slug}:`);
        if (descChanged) console.log(`    description: "${newDesc?.slice(0, 80)}..."`);
        if (capsChanged) console.log(`    capabilities: [${newCaps?.length} items]`);
        if (toolsChanged) console.log(`    tools: [${newTools?.length} items]`);
        if (tagsChanged) console.log(`    tags: +${newTags.length - existingTags.length} cross-refs`);
      } else {
        await sql`
          UPDATE agents
          SET description = ${newDesc},
              capabilities = ${newCaps},
              tools = ${newTools},
              tags = ${newTags},
              updated_at = NOW()
          WHERE id = ${row.id}
        `;
        console.log(`  UPDATED ${row.slug}`);
      }
      updated++;

      // Rate limit: 100ms between requests
      await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      console.log(`  ERROR ${row.slug}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
