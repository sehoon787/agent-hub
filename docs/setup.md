# Setup Guide

## Prerequisites

- Node.js 20+
- npm 10+
- GitHub account (for OAuth)
- Supabase account (optional, for submissions and analytics)

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
| `NEXT_PUBLIC_SUPABASE_URL` | For submit/analytics | Supabase project URL | [Supabase Setup](#supabase-setup) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For submit/analytics | Supabase anonymous key | [Supabase Setup](#supabase-setup) |
| `GITHUB_TOKEN` | For verification | GitHub PAT for link checking | [GitHub Settings](https://github.com/settings/tokens) |
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

### Supabase Setup

1. Go to https://supabase.com and create a new project
2. Go to **Settings → API**
3. Copy **Project URL** → paste as `NEXT_PUBLIC_SUPABASE_URL`
4. Copy **anon/public key** → paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Go to **SQL Editor** and run the contents of `supabase/schema.sql`

> Without Supabase, the app still works for browsing agents. Only the submit and visitor counting features require it.

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
