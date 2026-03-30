#!/usr/bin/env node
// scripts/collect-new-repos.mjs — Collect agents from discovered repos
//
// Fetches .md agent files from 40 GitHub repos via the API,
// parses YAML frontmatter, and merges new entries into agents.json.
// Uses owner--agentName slug convention to avoid collisions.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_PATH = join(__dirname, '..', 'src', 'lib', 'data', 'agents.json');

const TOKEN = process.env.GITHUB_TOKEN || '';
const headers = {
  Accept: 'application/vnd.github.v3+json',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

// Repos to collect from. `path` is the directory containing .md agent files.
// `recursive: true` means we need to fetch subdirectories too.
const REPOS = [
  { owner: 'lst97', repo: 'claude-code-sub-agents', path: 'agents', recursive: true },
  { owner: 'softaworks', repo: 'agent-toolkit', path: 'agents', recursive: false },
  { owner: 'hesreallyhim', repo: 'a-list-of-claude-code-agents', path: 'agents', recursive: false },
  { owner: 'darcyegb', repo: 'ClaudeCodeAgents', path: '', recursive: false },
  { owner: 'ruvnet', repo: 'agentic-flow', path: '.claude/agents', recursive: true },
  { owner: 'zhsama', repo: 'claude-sub-agent', path: 'agents', recursive: true },
  { owner: 'backant-io', repo: 'backant-agents', path: '', recursive: false },
  { owner: 'IncomeStreamSurfer', repo: 'claude-code-agents-wizard-v2', path: '.claude/agents', recursive: false },
  { owner: 'peterfei', repo: 'ai-agent-team', path: '.claude/agents', recursive: false },
  { owner: 'shinpr', repo: 'ai-coding-project-boilerplate', path: '.claude/agents-en', recursive: false },
  { owner: 'webdevtodayjason', repo: 'sub-agents', path: 'agents', recursive: true },
  { owner: 'dl-ezo', repo: 'claude-code-sub-agents', path: '', recursive: false },
  { owner: 'al3rez', repo: 'ooda-subagents', path: '.claude/agents', recursive: false },
  { owner: 'andlaf-ak', repo: 'claude-code-agents', path: '', recursive: true },
  { owner: 'supatest-ai', repo: 'awesome-claude-code-sub-agents', path: '', recursive: true },
  { owner: 'vizra-ai', repo: 'claude-code-agents', path: '', recursive: true },
  { owner: 'Gentleman-Programming', repo: 'gentleman-architecture-agents', path: '.claude/agents', recursive: false },
  { owner: 'undeadlist', repo: 'claude-code-agents', path: 'agents', recursive: false },
  { owner: 'tony', repo: 'claude-code-riper-5', path: '.claude/agents', recursive: false },
  { owner: 'augmnt', repo: 'agents', path: '', recursive: false },
  { owner: 'gensecaihq', repo: 'MCP-Developer-SubAgent', path: '.claude/agents', recursive: false },
  { owner: 'gensecaihq', repo: 'Claude-Code-Subagents-Collection', path: 'subagents', recursive: true },
  // === NEW: High-star repos ===
  { owner: 'msitarzewski', repo: 'agency-agents', path: '', recursive: true, platform: 'universal' },
  { owner: 'wshobson', repo: 'agents', path: 'agents', recursive: true },
  { owner: 'VoltAgent', repo: 'awesome-claude-code-subagents', path: 'categories', recursive: true },
  { owner: 'alirezarezvani', repo: 'claude-skills', path: 'agents', recursive: true, platform: 'universal' },
  { owner: 'rohitg00', repo: 'awesome-claude-code-toolkit', path: 'agents', recursive: false },
  { owner: '0xfurai', repo: 'claude-code-subagents', path: 'agents', recursive: false },
  { owner: 'stretchcloud', repo: 'claude-code-unified-agents', path: 'claude-code-unified-agents/.claude/agents', recursive: true },
  { owner: 'davepoon', repo: 'buildwithclaude', path: 'agents', recursive: true },
  // === NEW: Mid-star repos ===
  { owner: 'shintaro-sprech', repo: 'agent-orchestrator-template', path: '.claude/agents', recursive: false },
  { owner: 'Aedelon', repo: 'claude-code-blueprint', path: 'agents', recursive: false },
  { owner: '0ldh', repo: 'claude-code-agents-orchestra', path: 'agents', recursive: true },
  { owner: 'houseworthe', repo: 'house-agents', path: '.claude/agents', recursive: false },
  { owner: 'rshah515', repo: 'claude-code-subagents', path: '', recursive: true },
  { owner: 'mylee04', repo: 'claude-code-subagents', path: 'agents', recursive: true },
  { owner: 'valllabh', repo: 'claude-agents', path: 'claude/agents', recursive: false },
  { owner: 'pfangueiro', repo: 'claude-code-agents', path: '.claude/agents', recursive: false },
  { owner: 'artsmc', repo: 'claude-dev-agents', path: 'agents', recursive: true },
  { owner: 'SolutionsExcite', repo: 'claude-developer-template', path: '.claude/agents', recursive: false },
];

const VALID_CATEGORIES = ['orchestrator', 'specialist', 'worker', 'analyst'];
const VALID_MODELS = ['opus', 'sonnet', 'haiku', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gpt-5.4', 'gpt-5.4-mini', 'custom'];

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
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function inferCategory(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  if (/orchestrat|coordinator|planner|manager|lead/.test(text)) return 'orchestrator';
  if (/analy|research|investigat|audit|review|monitor/.test(text)) return 'analyst';
  if (/implement|build|develop|creat|writ|generat|code/.test(text)) return 'worker';
  return 'specialist';
}

function inferModel(text) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('opus')) return 'opus';
  if (lower.includes('haiku')) return 'haiku';
  return 'sonnet';
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchWithRetry(url, opts, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.status === 403) {
        const reset = res.headers.get('x-ratelimit-reset');
        if (reset) {
          const waitMs = Math.max(1000, (parseInt(reset) * 1000) - Date.now());
          console.warn(`Rate limited, waiting ${Math.ceil(waitMs / 1000)}s...`);
          await sleep(Math.min(waitMs, 60000));
          continue;
        }
      }
      if (res.status === 404) return null;
      return res;
    } catch (err) {
      if (i < retries - 1) {
        await sleep(1000 * (i + 1));
        continue;
      }
      return null;
    }
  }
  return null;
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.github', 'docs', 'examples', 'tests',
  'test', '__tests__', 'scripts', '.vscode', 'dist', 'build',
  'assets', 'images', 'img', '.husky',
  'skills', 'hooks', 'commands', 'rules', 'prompts', 'templates', 'config', 'src', 'lib', 'plugins',
]);

const SKIP_FILES = new Set([
  'readme.md', 'changelog.md', 'contributing.md', 'license.md',
  'code_of_conduct.md', 'security.md', 'todo.md',
]);

async function listMdFiles(owner, repo, path, recursive) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetchWithRetry(url, { headers });
  if (!res || !res.ok) {
    console.warn(`  Failed to list ${owner}/${repo}/${path}: ${res?.status}`);
    return [];
  }

  const items = await res.json();
  if (!Array.isArray(items)) return [];

  let mdFiles = items.filter(
    f => f.type === 'file' && f.name.endsWith('.md') && !SKIP_FILES.has(f.name.toLowerCase())
  );

  if (recursive) {
    const dirs = items.filter(f => f.type === 'dir' && !SKIP_DIRS.has(f.name.toLowerCase()));
    for (const dir of dirs) {
      await sleep(100);
      const subFiles = await listMdFiles(owner, repo, dir.path, true);
      mdFiles = mdFiles.concat(subFiles);
    }
  }

  return mdFiles;
}

async function main() {
  const agents = JSON.parse(readFileSync(AGENTS_PATH, 'utf8'));
  const existingSlugs = new Set(agents.map(a => a.slug));
  console.log(`Existing: ${agents.length} agents, ${existingSlugs.size} slugs`);

  const newAgents = [];
  let totalSkipped = 0;

  for (const { owner, repo, path, recursive, platform: repoPlatform } of REPOS) {
    console.log(`\nScanning ${owner}/${repo} (path: ${path || '/'})...`);

    const mdFiles = await listMdFiles(owner, repo, path, recursive);
    console.log(`  Found ${mdFiles.length} .md files`);

    let repoAdded = 0;
    for (const file of mdFiles) {
      await sleep(50);

      const fileRes = await fetchWithRetry(file.download_url, {});
      if (!fileRes || !fileRes.ok) continue;

      const content = await fileRes.text();
      const fm = parseFrontmatter(content);

      // Extract agent name from frontmatter or filename
      const rawName = fm.name || file.name.replace('.md', '');
      const agentSlug = slugify(rawName);

      // Create prefixed slug: owner--agentSlug
      const prefixedSlug = `${slugify(owner)}--${agentSlug}`;

      if (existingSlugs.has(prefixedSlug)) {
        totalSkipped++;
        continue;
      }

      // Extract description
      let description = fm.description || '';
      if (!description) {
        const lines = content.split('\n');
        let inFm = false;
        for (const line of lines) {
          if (line.trim() === '---') { inFm = !inFm; continue; }
          if (inFm) continue;
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.length > 20) {
            description = trimmed.slice(0, 200);
            break;
          }
        }
      }
      if (!description) description = `Agent from ${owner}/${repo}`;

      // Category
      let category = (fm.category || '').toLowerCase();
      if (!VALID_CATEGORIES.includes(category)) {
        category = inferCategory(rawName, description);
      }

      // Model
      let model = (fm.model || '').toLowerCase();
      if (!VALID_MODELS.includes(model)) {
        model = inferModel(fm.model || content.slice(0, 500));
      }

      const today = new Date().toISOString().split('T')[0];

      const entry = {
        slug: prefixedSlug,
        name: agentSlug,
        displayName: `${owner}/${rawName}`,
        description: description.slice(0, 300),
        longDescription: fm.longDescription || fm.long_description || '',
        category,
        model,
        source: 'community',
        platform: repoPlatform || 'claude',
        author: fm.author || owner,
        githubUrl: file.html_url || `https://github.com/${owner}/${repo}`,
        installCommand: file.download_url
          ? `curl -o ~/.claude/agents/${agentSlug}.md ${file.download_url}`
          : '',
        capabilities: fm.capabilities ? fm.capabilities.split(',').map(s => s.trim()).filter(Boolean) : [],
        tools: fm.tools ? fm.tools.split(',').map(s => s.trim()).filter(Boolean) : [],
        tags: fm.tags ? fm.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        createdAt: today,
        updatedAt: today,
        stars: 0,
        forks: 0,
        featured: false,
        verified: false,
      };

      newAgents.push(entry);
      existingSlugs.add(prefixedSlug);
      repoAdded++;
    }

    console.log(`  Added ${repoAdded} agents from this repo (total new: ${newAgents.length})`);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`New agents: ${newAgents.length}`);
  console.log(`Skipped (duplicate): ${totalSkipped}`);

  if (newAgents.length === 0) {
    console.log('No new agents to add.');
    return;
  }

  // Merge and write
  const merged = [...agents, ...newAgents];
  writeFileSync(AGENTS_PATH, JSON.stringify(merged, null, 2) + '\n');
  console.log(`Total agents now: ${merged.length}`);
  console.log(`Written to ${AGENTS_PATH}`);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
