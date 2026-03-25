# API Reference

All API endpoints are under `/api/`.

## Agents

### GET /api/agents

List agents with optional filters.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search query |
| `category` | string | Filter by category (orchestrator, specialist, worker, analyst) |
| `model` | string | Filter by model (opus, sonnet, haiku) |
| `platform` | string | Filter by platform (claude, gemini, codex, universal) |
| `source` | string | Filter by source (official, community, plugin) |
| `sort` | string | Sort order (popular, recent, name) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page |

**Response:**

```json
{
  "agents": [...],
  "total": 93,
  "page": 1,
  "totalPages": 5
}
```

### GET /api/agents/[slug]

Get a single agent by slug.

**Response:** `Agent` object

### POST /api/agents

Submit a new agent. Requires GitHub authentication.

**Headers:** Must have valid Auth.js session (GitHub OAuth)

**Body:**

```json
{
  "name": "my-agent",
  "displayName": "My Agent",
  "description": "What the agent does",
  "longDescription": "Detailed description (optional)",
  "category": "specialist",
  "model": "sonnet",
  "author": "Your Name",
  "githubUrl": "https://github.com/user/repo",
  "capabilities": "cap1, cap2",
  "tools": "tool1, tool2",
  "tags": "tag1, tag2"
}
```

**Response (201):**

```json
{
  "success": true,
  "slug": "my-agent",
  "message": "Submission saved. It will be reviewed before publishing."
}
```

**Errors:**
- `401` — Not authenticated
- `400` — Validation failed or security check failed
- `503` — Supabase not configured

## Search

### GET /api/search

Unified search across all agents.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search query (required) |

**Response:**

```json
{
  "results": [...]
}
```

## Stats

### GET /api/stats

Get aggregate statistics.

**Response:**

```json
{
  "totalAgents": 93,
  "categories": { "orchestrator": 5, "specialist": 66, "worker": 12, "analyst": 10 },
  "platforms": { "claude": 80, "gemini": 8, "codex": 3, "universal": 2 },
  "contributors": 15
}
```

## Views

### GET /api/views

Get visitor counts. Returns zeros if Supabase is not configured.

**Response:**

```json
{
  "total": 1234,
  "today": 56
}
```

### POST /api/views

Record a page view. No-op if Supabase is not configured.

**Response:**

```json
{
  "success": true
}
```

## Verification

### POST /api/verify

Verify that a GitHub URL exists and is accessible.

**Body:**

```json
{
  "url": "https://github.com/user/repo"
}
```

**Response:**

```json
{
  "valid": true,
  "status": 200,
  "message": "URL is valid"
}
```

Only GitHub URLs (`https://github.com/...`) are accepted.

## Collection

### POST /api/collect

Trigger auto-collection of agents from GitHub repositories. Discovers new agents not already in the registry.

**Response:**

```json
{
  "success": true,
  "collected": 3,
  "entries": [...]
}
```
