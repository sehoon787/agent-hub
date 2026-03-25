# Deployment Guide

## Vercel (Recommended)

### Step 1: Push to GitHub

Your code should already be on GitHub. If not:

```bash
git add -A
git commit -m "ready for deployment"
git push origin master
```

### Step 2: Import to Vercel

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select `sehoon787/agent-hub`
4. Framework Preset: **Next.js** (auto-detected)
5. Click **"Deploy"**

### Step 3: Configure Environment Variables

In Vercel Dashboard → Your Project → **Settings** → **Environment Variables**:

Add these variables:

| Name | Value |
|------|-------|
| `AUTH_SECRET` | (generate with `openssl rand -base64 32`) |
| `GITHUB_ID` | (from GitHub OAuth App) |
| `GITHUB_SECRET` | (from GitHub OAuth App) |
| `NEXT_PUBLIC_SUPABASE_URL` | (from Supabase dashboard) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (from Supabase dashboard) |
| `NEXT_PUBLIC_SITE_URL` | `https://your-project.vercel.app` |

### Step 4: Update GitHub OAuth App

Update your GitHub OAuth App's URLs:
- **Homepage URL**: `https://your-project.vercel.app`
- **Authorization callback URL**: `https://your-project.vercel.app/api/auth/callback/github`

### Step 5: Redeploy

After setting environment variables, trigger a redeployment:
- Go to **Deployments** tab → click **"Redeploy"** on the latest deployment

### Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_SITE_URL` and GitHub OAuth App URLs

## Without Supabase

The app works for browsing without Supabase. Features that require Supabase:
- Agent submissions (submit form)
- Visitor counting (total/daily)

All other features (browse, search, filter, agent details) work with JSON data only.
