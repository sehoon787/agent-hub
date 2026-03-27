import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

const GITHUB_REPO = process.env.GITHUB_REPO || 'sehoon787/agent-hub';

export function githubApiUrl(path: string): string {
  return `https://api.github.com/repos/${GITHUB_REPO}/${path}`;
}

export function getGithubHeaders(token?: string): Record<string, string> {
  const t = token || process.env.GITHUB_TOKEN;
  const h: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export async function getAccessToken(request: NextRequest): Promise<string | null> {
  const token = await getToken({ req: request });
  return (token?.accessToken as string) ?? null;
}
