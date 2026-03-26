# Architecture

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 15 (App Router) | SSG + API routes |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS v4 + shadcn/ui | UI components |
| Auth | Auth.js v5 (NextAuth) | GitHub OAuth |
| Database | None (DB-free) | All data in JSON + GitHub Issues |
| Data | JSON files | Agent registry (read-only) |
| Deployment | Vercel | Hosting, serverless |
| CI/CD | GitHub Actions | Lint, type check, build, agent verification |

## Data Flow

```
agents.json (static) ──> getAgents() ──> Browse/Search/Detail pages
                                    ──> /api/agents (REST)

GitHub OAuth ──> Auth.js ──> Session ──> Submit Form
                                    ──> /api/agents POST

Submit Form ──> /api/agents POST ──> GitHub Issues API ──> Issue created
GitHub Actions ──> issue-to-pr.yml ──> agents.json PR ──> Review & merge
```

## Key Design Decisions

1. **JSON over Database for agent data** -- Agents are static content. JSON files enable SSG (Static Site Generation), making pages load instantly. No database query on every page load.

2. **GitHub Issues for submissions** -- Submissions create GitHub Issues which are reviewed and merged via automated workflows. No database needed.

3. **Multi-platform from day one** -- The agent ecosystem spans Claude, Gemini, and Codex. AgentHub is platform-agnostic by design.

4. **Verification in CI** -- The GitHub Actions workflow validates every agent entry on every push. No invalid data can reach production.

## SEO Strategy

- Dynamic `sitemap.xml` with all 93+ agent URLs
- `robots.txt` allowing all crawlers
- JSON-LD structured data (WebSite, CollectionPage, SoftwareApplication)
- Unique title/description per page
- Open Graph tags for social sharing
