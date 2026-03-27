import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAccessToken } from '@/lib/github-api';

const PLATFORM_KEYWORDS: Record<string, string[]> = {
  claude: ['claude-code', 'claude', 'anthropic'],
  gemini: ['gemini', 'google-ai', 'gemini-cli'],
  codex: ['codex', 'openai-codex'],
  cursor: ['cursor'],
  windsurf: ['windsurf'],
  aider: ['aider'],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  orchestrator: ['orchestrator', 'orchestration', 'meta-agent'],
  specialist: ['specialist', 'expert'],
  worker: ['worker', 'executor', 'implementation'],
  analyst: ['analyst', 'analysis', 'research'],
};

function detectFromTopics(topics: string[], keywordMap: Record<string, string[]>): string | null {
  for (const [key, keywords] of Object.entries(keywordMap)) {
    if (topics.some((t) => keywords.includes(t.toLowerCase()))) {
      return key;
    }
  }
  return null;
}

function parseOwnerRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
  }

  const parsed = parseOwnerRepo(url);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
  }

  const accessToken = await getAccessToken(request);
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
    { headers, cache: 'no-store' }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Repository not found or not accessible' },
      { status: res.status === 404 ? 404 : 502 }
    );
  }

  const data = await res.json();
  const topics: string[] = data.topics ?? [];

  return NextResponse.json({
    name: data.name ?? '',
    description: data.description ?? '',
    topics,
    suggestedPlatform: detectFromTopics(topics, PLATFORM_KEYWORDS),
    suggestedCategory: detectFromTopics(topics, CATEGORY_KEYWORDS),
  });
}
