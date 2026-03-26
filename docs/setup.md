# Setup Guide

## Prerequisites

- Node.js 20+
- npm 10+
- GitHub account (for OAuth)

## Installation

```bash
git clone https://github.com/sehoon787/agent-hub.git
cd agent-hub
npm install
cp .env.example .env.local
```

## Environment Variables

| Variable | Required | Description | How to Get |
|----------|----------|-------------|------------|
| `AUTH_SECRET` | Yes | Auth.js session encryption key | Run: `openssl rand -base64 32` |
| `GITHUB_ID` | For login | GitHub OAuth App Client ID | [Create OAuth App](#github-oauth-setup) |
| `GITHUB_SECRET` | For login | GitHub OAuth App Client Secret | [Create OAuth App](#github-oauth-setup) |
| `GITHUB_TOKEN` | For verification/submit | GitHub PAT for link checking and submissions | [GitHub Settings](https://github.com/settings/tokens) |
| `CRON_SECRET` | For auto-collect | Secret for cron endpoint auth | Generate with: openssl rand -hex 32 |
| `NEXT_PUBLIC_SITE_URL` | For SEO | Production URL | Your Vercel domain |

### GitHub OAuth Setup

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: `AgentHub`
   - **Homepage URL**: `http://localhost:3100` (dev) or your production URL
   - **Authorization callback URL**: `http://localhost:3100/api/auth/callback/github`
4. Click **"Register application"**
5. Copy **Client ID** → paste as `GITHUB_ID` in `.env.local`
6. Click **"Generate a new client secret"**
7. Copy **Client Secret** → paste as `GITHUB_SECRET` in `.env.local`

> For production (Vercel), create a second OAuth App with your production URL, or update the existing one.

> **Note:** `GITHUB_TOKEN` is required for agent submissions. Submissions create GitHub Issues which are reviewed and processed into PRs via GitHub Actions.

### Generate AUTH_SECRET

```bash
openssl rand -base64 32
```

Copy the output and paste as `AUTH_SECRET` in `.env.local`.

## Running Locally

```bash
npm run dev -- --port 3100
# Open http://localhost:3100
```
