#!/usr/bin/env node
// scripts/enrich-metadata.mjs
// Enriches agent/skill metadata by fetching and parsing their markdown source files.
// Usage: node scripts/enrich-metadata.mjs [--repo owner/repo] [--dry-run] [--force]

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const forceAll = args.includes('--force');
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

// Extract long description from markdown body (full content minus frontmatter, cleaned up)
function extractLongDescription(content) {
  const body = content.replace(/^---[\s\S]*?---\r?\n?/, '').trim();
  if (!body) return '';
  // Remove code blocks to keep it readable
  const cleaned = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned.slice(0, 5000) || '';
}

// Strip leading emoji/unicode symbols from a heading string for matching
function stripEmoji(str) {
  // Remove leading emoji, symbols, and whitespace before matching
  return str.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F300}-\u{1F9FF}🎯🔧🚀📋✅🌟💡⚡🏗️🎨🔍📦🧪🛠️]+\s*/u, '').trim();
}

// Extract bullets from a section string
function extractBulletsFromSection(section) {
  const results = [];
  for (const line of section.split('\n')) {
    const item = line.match(/^\s*[-*]\s+(?:\*\*)?(.+?)(?:\*\*)?$/) ||
                 line.match(/^\s*\d+\.\s+(?:\*\*)?(.+?)(?:\*\*)?$/);
    if (item) {
      const text = item[1].trim().replace(/\*\*/g, '').replace(/`/g, '');
      if (text.length > 10 && text.length < 300 && !text.startsWith('http') && !text.match(/^\[.+\]\(.+\)$/)) {
        results.push(text.slice(0, 200));
      }
    }
  }
  return results;
}

// Extract capabilities from markdown sections — expanded patterns
function extractCapabilities(content) {
  // Remove frontmatter and code blocks for processing
  const body = content.replace(/^---[\s\S]*?---\r?\n?/, '').trim();
  const bodyNoCode = body.replace(/```[\s\S]*?```/g, '');

  // Ordered list of heading keywords that signal capability-like content
  // Each entry is a regex that matches the heading text (after emoji strip)
  const capabilityHeadings = [
    /^capabilities?$/i,
    /^core\s+capabilities?$/i,
    /^features?$/i,
    /^core\s+features?$/i,
    /^what\s+(?:it|this\s+(?:skill|agent))\s+does?$/i,
    /^what\s+this\s+skill\s+(?:does|provides?)$/i,
    /^core\s+(?:competencies|expertise|concepts|mission)$/i,
    /^key\s+(?:responsibilities|principles|functions|capabilities?)$/i,
    /^focus\s+areas?$/i,
    /^design\s+principles?$/i,
    /^implementation\s+best\s+practices?$/i,
    /^best\s+practices?$/i,
    /^(?:core\s+)?workflows?$/i,
    /^core\s+(?:principles?|framework)$/i,
    /^frameworks?$/i,
    /^purpose$/i,
    /^overview$/i,
    /^role\s*(?:&|and)\s*expertise$/i,
    /^skill\s+integration$/i,
    /^advanced\s+features?$/i,
    /^quick\s+start$/i,
    /^trigger\s+phrases?$/i,
    /^approach$/i,
    /^checklist$/i,
    /^common\s+patterns?$/i,
    /^success\s+(?:metrics?|criteria)$/i,
    /^when\s+to\s+use(?:\s+this\s+skill)?$/i,
  ];

  // Split body into sections by ## headings
  const sections = bodyNoCode.split(/(?=^##\s)/m);

  // First pass: find sections whose heading matches a capability pattern
  for (const section of sections) {
    const headingMatch = section.match(/^##\s+(.+)/);
    if (!headingMatch) continue;
    const headingText = stripEmoji(headingMatch[1]).trim().replace(/:$/, '');
    const isCapabilitySection = capabilityHeadings.some(p => p.test(headingText));
    if (!isCapabilitySection) continue;

    // Extract after the heading line
    const afterHeading = section.replace(/^##\s+.+\n/, '');
    const bullets = extractBulletsFromSection(afterHeading);
    if (bullets.length > 0) {
      return bullets.slice(0, 15);
    }
  }

  // Second pass: extract bullets from the first 3 content sections (skip empty/heading-only)
  const caps = [];
  let sectionsChecked = 0;
  for (const section of sections) {
    if (sectionsChecked >= 3) break;
    const afterHeading = section.replace(/^##\s+.+\n/, '');
    const bullets = extractBulletsFromSection(afterHeading);
    if (bullets.length > 0) {
      caps.push(...bullets);
      sectionsChecked++;
    }
  }
  if (caps.length > 0) return caps.slice(0, 15);

  // Fallback: extract ANY meaningful bullets from the entire document
  const allBullets = extractBulletsFromSection(bodyNoCode);
  return allBullets.slice(0, 15);
}

// Extract tools from markdown — expanded patterns
function extractTools(content) {
  const tools = [];

  // Frontmatter tools: is the highest-priority source (already handled in main via fm.tools,
  // but also check body-level "tools:" blocks for completeness)
  const fmTools = content.match(/^tools:\s*\n((?:\s+-\s+.+\n?)+)/m);
  if (fmTools) {
    for (const line of fmTools[1].split('\n')) {
      const item = line.match(/^\s+-\s+(.+)/);
      if (item) {
        const t = item[1].trim();
        if (!tools.includes(t)) tools.push(t);
      }
    }
    if (tools.length > 0) return tools.slice(0, 20);
  }

  // Tool headings to search for (heading text after emoji strip)
  const toolHeadings = [
    /^(?:available\s+)?tools?(?:\s+available)?$/i,
    /^development\s+(?:workflow|tools?|environment)$/i,
    /^(?:tech(?:nical)?\s+)?stack$/i,
    /^(?:required\s+)?(?:technologies|dependencies)$/i,
    /^common\s+components?$/i,
    /^integration\s+patterns?$/i,
    /^hooks?$/i,
    /^mui[-\s]specific\s+hooks?$/i,
  ];

  const body = content.replace(/^---[\s\S]*?---\r?\n?/, '').trim();
  const sections = body.split(/(?=^##\s)/m);

  for (const section of sections) {
    const headingMatch = section.match(/^##\s+(.+)/);
    if (!headingMatch) continue;
    const headingText = stripEmoji(headingMatch[1]).trim().replace(/:$/, '');
    const isToolSection = toolHeadings.some(p => p.test(headingText));
    if (!isToolSection) continue;

    const afterHeading = section.replace(/^##\s+.+\n/, '');

    // Extract ### sub-headings as tool names (e.g., ### risk_assessment.py)
    for (const line of afterHeading.split('\n')) {
      const subHeading = line.match(/^###\s+(.+)/);
      if (subHeading) {
        const name = subHeading[1].trim().replace(/\*\*/g, '');
        if (name.length > 1 && name.length < 80 && !tools.includes(name)) {
          tools.push(name);
        }
      }
    }

    // Extract bullet items
    for (const line of afterHeading.split('\n')) {
      const item = line.match(/^\s*[-*]\s+(?:\*\*)?([A-Za-z][A-Za-z0-9_./ -]*)(?:\*\*)?/);
      if (item) {
        const toolName = item[1].trim().replace(/\*\*/g, '');
        if (toolName.length > 1 && toolName.length < 80 && !tools.includes(toolName)) {
          tools.push(toolName);
        }
      }
    }

    if (tools.length > 0) break;
  }

  // Secondary: extract backtick-quoted names from body that look like tool/component names
  // (e.g., `useMediaQuery`, `risk_assessment.py`, `eslint`)
  if (tools.length === 0) {
    const backtickItems = [];
    const backtickRe = /`([A-Za-z][A-Za-z0-9_./:-]{2,40})`/g;
    let m;
    while ((m = backtickRe.exec(body)) !== null) {
      const name = m[1];
      // Filter: looks like a tool/command name (has extension, or camelCase, or snake_case with underscores)
      if (/\.|_|-/.test(name) || /^[a-z][a-z0-9]+(?:[A-Z][a-z0-9]+)+$/.test(name)) {
        if (!backtickItems.includes(name)) backtickItems.push(name);
      }
      if (backtickItems.length >= 20) break;
    }
    tools.push(...backtickItems);
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
  console.log(`Enrichment script v2 started${dryRun ? ' (DRY RUN)' : ''}${forceAll ? ' (FORCE ALL)' : ''}`);
  if (repoFilter) console.log(`Filtering to repo: ${repoFilter}`);

  // Fetch items that need enrichment
  // With --force: re-process ALL items (overwrite caps/tools/long_description)
  // Without --force: only items missing data
  let rows;
  if (forceAll) {
    if (repoFilter) {
      const pattern = `%${repoFilter}%`;
      rows = await sql`
        SELECT id, slug, type, name, display_name, description, long_description,
               capabilities, tools, tags, install_command, github_url
        FROM agents
        WHERE github_url LIKE ${pattern}
        ORDER BY id
      `;
    } else {
      rows = await sql`
        SELECT id, slug, type, name, display_name, description, long_description,
               capabilities, tools, tags, install_command, github_url
        FROM agents
        ORDER BY id
      `;
    }
  } else {
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
          OR long_description IS NULL OR long_description = ''
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
          OR long_description IS NULL OR long_description = ''
        )
        ORDER BY id
      `;
    }
  }
  console.log(`Found ${rows.length} items to process`);

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

      // Capabilities: frontmatter > body extraction. With --force, always re-extract.
      const fmCaps = Array.isArray(fm.capabilities) ? fm.capabilities : [];
      const bodyCaps = extractCapabilities(content);
      let newCaps;
      if (forceAll || !row.capabilities?.length) {
        newCaps = fmCaps.length > 0 ? fmCaps : bodyCaps;
      } else {
        newCaps = row.capabilities;
      }

      // Tools: frontmatter > body extraction. With --force, always re-extract.
      const fmToolsList = Array.isArray(fm.tools) ? fm.tools : [];
      const bodyTools = extractTools(content);
      let newTools;
      if (forceAll || !row.tools?.length) {
        newTools = fmToolsList.length > 0 ? fmToolsList : bodyTools;
      } else {
        newTools = row.tools;
      }

      // Long description: always fill if empty or --force
      let newLongDesc;
      if (forceAll || !row.long_description) {
        newLongDesc = extractLongDescription(content);
      } else {
        newLongDesc = row.long_description;
      }

      const crossRefs = extractCrossRefs(content, allSlugs.filter(s => s !== row.slug));
      const existingTags = row.tags || [];
      const newTags = [...new Set([...existingTags, ...crossRefs])].slice(0, 20);

      // Check if anything changed
      const descChanged = newDesc !== row.description;
      const capsChanged = JSON.stringify(newCaps) !== JSON.stringify(row.capabilities);
      const toolsChanged = JSON.stringify(newTools) !== JSON.stringify(row.tools);
      const tagsChanged = JSON.stringify(newTags) !== JSON.stringify(existingTags);
      const longDescChanged = newLongDesc !== (row.long_description || '');

      if (!descChanged && !capsChanged && !toolsChanged && !tagsChanged && !longDescChanged) {
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log(`  WOULD UPDATE ${row.slug}:`);
        if (descChanged) console.log(`    description: "${newDesc?.slice(0, 80)}..."`);
        if (capsChanged) console.log(`    capabilities: [${newCaps?.length} items]`);
        if (toolsChanged) console.log(`    tools: [${newTools?.length} items]`);
        if (longDescChanged) console.log(`    long_description: ${newLongDesc?.length} chars`);
        if (tagsChanged) console.log(`    tags: +${newTags.length - existingTags.length} cross-refs`);
      } else {
        await sql`
          UPDATE agents
          SET description = ${newDesc},
              capabilities = ${newCaps},
              tools = ${newTools},
              long_description = ${newLongDesc},
              tags = ${newTags},
              updated_at = NOW()
          WHERE id = ${row.id}
        `;
        console.log(`  UPDATED ${row.slug} (caps:${newCaps?.length || 0} tools:${newTools?.length || 0} longDesc:${newLongDesc?.length || 0})`);
      }
      updated++;

      // Rate limit: 50ms between requests
      await new Promise(r => setTimeout(r, 50));
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
