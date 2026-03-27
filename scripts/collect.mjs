#!/usr/bin/env node
// scripts/collect.mjs — Auto-collection script for GitHub Actions
//
// Reads agents.json, fetches .md files from known GitHub repos,
// parses YAML frontmatter, and merges new entries back.
// Self-contained — no imports from src/lib/.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_PATH = join(__dirname, '..', 'src', 'lib', 'data', 'agents.json');

const KNOWN_REPOS = [
  { owner: 'anthropics', repo: 'claude-code', path: 'agents' },
  { owner: 'Yeachan-Heo', repo: 'oh-my-claudecode', path: 'agents' },
  { owner: 'wshobson', repo: 'agents', path: '' },
];

const VALID_CATEGORIES = ['orchestrator', 'specialist', 'worker', 'analyst'];
const VALID_MODELS = ['opus', 'sonnet', 'haiku', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gpt-5.4', 'gpt-5.4-mini', 'custom'];
const VALID_PLATFORMS = ['claude', 'gemini', 'codex', 'cursor', 'windsurf', 'aider', 'universal'];

// Same patterns as src/lib/security.ts
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

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx > 0 && !line.startsWith(' ') && !line.startsWith('\t')) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (val === '>' || val === '|') {
        currentKey = key;
        fm[key] = '';
      } else {
        currentKey = null;
        fm[key] = val;
      }
    } else if (currentKey && (line.startsWith('  ') || line.startsWith('\t'))) {
      fm[currentKey] += (fm[currentKey] ? ' ' : '') + line.trim();
    } else {
      currentKey = null;
    }
  }
  return fm;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function checkMalicious(text) {
  const issues = [];
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      issues.push(`Suspicious pattern: ${pattern.source}`);
    }
  }
  return issues;
}

function validateEntry(entry) {
  if (!entry.slug) return 'missing slug';
  if (!entry.name) return 'missing name';
  if (!entry.displayName) return 'missing displayName';
  if (!entry.description) return 'missing description';
  if (!entry.category || !VALID_CATEGORIES.includes(entry.category)) return `invalid category: ${entry.category}`;
  if (!entry.model || !VALID_MODELS.includes(entry.model)) return `invalid model: ${entry.model}`;
  if (!entry.platform || !VALID_PLATFORMS.includes(entry.platform)) return `invalid platform: ${entry.platform}`;
  return null;
}

async function fetchRepoEntries(owner, repo, path) {
  const token = process.env.GITHUB_COLLECT_TOKEN || process.env.GITHUB_TOKEN;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(apiUrl, { headers });
  if (!res.ok) {
    console.warn(`  Skipping ${owner}/${repo}/${path}: HTTP ${res.status}`);
    return [];
  }

  const files = await res.json();
  if (!Array.isArray(files)) return [];

  const entries = [];

  for (const file of files) {
    if (!file.name.endsWith('.md')) continue;

    const fileRes = await fetch(file.download_url, { headers });
    if (!fileRes.ok) continue;

    const content = await fileRes.text();
    const fm = parseFrontmatter(content);
    const rawName = fm.name || file.name.replace('.md', '');
    const slug = slugify(rawName);

    // Build entry with defaults
    const today = new Date().toISOString().split('T')[0];
    const platform = (fm.platform || 'claude').toLowerCase();
    const entry = {
      slug,
      name: rawName.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
      displayName: fm.displayName || fm.display_name || rawName,
      description: fm.description || content.split('\n').find((l) => l.trim().length > 0 && !l.startsWith('#') && !l.startsWith('---')) || '',
      longDescription: fm.longDescription || fm.long_description || '',
      category: (fm.category || '').toLowerCase(),
      model: (fm.model || '').toLowerCase(),
      source: 'community',
      platform,
      author: fm.author || `${owner}`,
      githubUrl: file.html_url || '',
      installCommand: platform === 'claude' ? `npx claude-code --agent ${slug}` : (platform === 'codex' ? `codex --agent ${slug}` : ''),
      capabilities: fm.capabilities ? fm.capabilities.split(',').map((s) => s.trim()).filter(Boolean) : [],
      tools: fm.tools ? fm.tools.split(',').map((s) => s.trim()).filter(Boolean) : [],
      tags: fm.tags ? fm.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
      createdAt: today,
      updatedAt: today,
      stars: 0,
      forks: 0,
      featured: false,
      verified: false,
    };

    entries.push(entry);
  }

  return entries;
}

async function main() {
  // Read existing agents
  const agents = JSON.parse(readFileSync(AGENTS_PATH, 'utf8'));
  const existingSlugs = new Set(agents.map((a) => a.slug));

  const newAgents = [];

  for (const { owner, repo, path } of KNOWN_REPOS) {
    console.log(`Scanning ${owner}/${repo}/${path}...`);
    try {
      const entries = await fetchRepoEntries(owner, repo, path);
      for (const entry of entries) {
        // Skip duplicates
        if (existingSlugs.has(entry.slug)) continue;

        // Validate required fields
        const validationError = validateEntry(entry);
        if (validationError) {
          console.warn(`  Skipping "${entry.slug}": ${validationError}`);
          continue;
        }

        // Security check
        const allText = [
          entry.name, entry.displayName, entry.description,
          entry.longDescription, entry.githubUrl,
          ...entry.capabilities, ...entry.tools, ...entry.tags,
        ].join(' ');
        const issues = checkMalicious(allText);
        if (issues.length > 0) {
          console.warn(`  Skipping "${entry.slug}" (security): ${issues.join(', ')}`);
          continue;
        }

        newAgents.push(entry);
        existingSlugs.add(entry.slug);
      }
    } catch (err) {
      console.warn(`  Error scanning ${owner}/${repo}: ${err.message}`);
    }
  }

  if (newAgents.length === 0) {
    console.log('No new agents found.');
    return;
  }

  // Merge and write
  const merged = [...agents, ...newAgents];
  writeFileSync(AGENTS_PATH, JSON.stringify(merged, null, 2) + '\n');

  const names = newAgents.map((a) => a.displayName).join(', ');
  console.log(`Collected ${newAgents.length} new agents: ${names}`);
}

main().catch((err) => {
  console.error('Collection failed:', err);
  process.exit(1);
});
