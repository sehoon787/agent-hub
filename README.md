# AgentHub

The open-source registry for discovering and sharing AI coding agents across Claude Code, Gemini CLI, and OpenAI Codex CLI.

**Live**: [agent-hub.vercel.app](https://agent-hub.vercel.app)
**GitHub**: [github.com/sehoon787/agent-hub](https://github.com/sehoon787/agent-hub)

## Features

- **Search & Filter** -- Find agents by name, category, model, platform, or tags
- **90+ Verified Agents** -- Real agents from Claude Code, Gemini CLI, and Codex ecosystems
- **Multi-Platform** -- Support for Claude, Gemini, Codex, and universal agents
- **Submit Agents** -- Contribute new agents with GitHub OAuth authentication
- **Security Checks** -- Automatic malicious content detection on submissions
- **Verification** -- Link validation and agent verification system
- **Analytics** -- Total and daily visitor tracking
- **Auto-Collection** -- Automated agent discovery from GitHub repositories
- **Modern UI** -- Dark theme, responsive design, built with shadcn/ui

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| [Next.js 15](https://nextjs.org/) | React framework (App Router) |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Tailwind CSS v4](https://tailwindcss.com/) | Styling |
| [shadcn/ui](https://ui.shadcn.com/) | UI components |
| [Auth.js v5](https://authjs.dev/) | GitHub OAuth |
| [Supabase](https://supabase.com/) | Database (optional) |
| [Vercel](https://vercel.com/) | Hosting & deployment |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
git clone https://github.com/sehoon787/agent-hub.git
cd agent-hub
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | Auth.js secret (`openssl rand -base64 32`) |
| `GITHUB_ID` | Yes* | GitHub OAuth App Client ID |
| `GITHUB_SECRET` | Yes* | GitHub OAuth App Client Secret |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anonymous key |
| `GITHUB_TOKEN` | No | For link verification & auto-collection |
| `NEXT_PUBLIC_SITE_URL` | No | Production URL |

*Required for submit functionality. App works for browsing without these.

### Development

```bash
npm run dev -- --port 3100
```

### Build

```bash
npm run build
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Set environment variables in Vercel dashboard
4. Deploy

### Supabase Setup (Optional)

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to environment

## Supported Platforms

| Platform | Agent Format | Config Directory |
|----------|-------------|-----------------|
| Claude Code | `.md` with YAML frontmatter | `.claude/agents/` |
| Gemini CLI | `.md` with YAML frontmatter | `.gemini/agents/` |
| Codex CLI | `.toml` files | `.codex/agents/` |

All three platforms share the `SKILL.md` open standard for skills.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── agents/             # Agent browse & detail pages
│   ├── search/             # Search page
│   ├── submit/             # Agent submission form
│   ├── about/              # About page
│   └── api/                # API routes
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Header, Footer
│   ├── cards/              # Agent, Stat cards
│   ├── search/             # Search input
│   ├── filters/            # Filter sidebar
│   ├── detail/             # Install command, capabilities, related items
│   └── home/               # Hero, stats, featured, categories sections
└── lib/
    ├── types.ts            # TypeScript interfaces
    ├── data.ts             # Data access layer
    ├── collector.ts        # Auto-collection from GitHub
    └── data/               # JSON seed data files
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List agents (q, category, model, source, platform, sort, page) |
| GET | `/api/agents/[slug]` | Get single agent |
| POST | `/api/agents` | Submit new agent |
| GET | `/api/search` | Search agents (q) |
| GET | `/api/stats` | Aggregate statistics |
| GET | `/api/views` | Get visitor counts (total, today) |
| POST | `/api/views` | Record a page view |
| POST | `/api/collect` | Trigger auto-collection from GitHub |
| POST | `/api/verify` | Verify agent GitHub links |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-agent`)
3. Add entries to the JSON data files in `src/lib/data/`
4. Commit your changes (`git commit -m 'feat: add new agent'`)
5. Push to the branch (`git push origin feature/new-agent`)
6. Open a Pull Request

Or submit agents directly through the website's Submit page.

## License

MIT
