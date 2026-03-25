# Architecture

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 15 (App Router) | SSG + API routes |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS v4 + shadcn/ui | UI components |
| Auth | Auth.js v5 (NextAuth) | GitHub OAuth |
| Database | Supabase (optional) | Submissions, analytics |
| Data | JSON files | Agent registry (read-only) |
| Deployment | Vercel | Hosting, serverless |
| CI/CD | GitHub Actions | Lint, type check, build, agent verification |

## Data Flow

```
agents.json (static) ──> getAgents() ──> Browse/Search/Detail pages
                                    ──> /api/agents (REST)

GitHub OAuth ──> Auth.js ──> Session ──> Submit Form
                                    ──> /api/agents POST

Supabase ──> submissions table ──> Pending review
         ──> page_views table  ──> Visitor counter
         ──> daily_views table ──> Daily counter
```

## Key Design Decisions

1. **JSON over Database for agent data** -- Agents are static content. JSON files enable SSG (Static Site Generation), making pages load instantly. No database query on every page load.

2. **Supabase only for dynamic data** -- Submissions and view counts need persistence. Everything else works without a database.

3. **Multi-platform from day one** -- The agent ecosystem spans Claude, Gemini, and Codex. AgentHub is platform-agnostic by design.

4. **Verification in CI** -- The GitHub Actions workflow validates every agent entry on every push. No invalid data can reach production.

## SEO Strategy

- Dynamic `sitemap.xml` with all 93+ agent URLs
- `robots.txt` allowing all crawlers
- JSON-LD structured data (WebSite, CollectionPage, SoftwareApplication)
- Unique title/description per page
- Open Graph tags for social sharing
