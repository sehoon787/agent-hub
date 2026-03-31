import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { githubApiUrl, getGithubHeaders, getAccessToken } from '@/lib/github-api';

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  labels: { name: string }[];
  body: string;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const login = session.user.login;
  if (!login) {
    return NextResponse.json(
      { error: 'Session missing GitHub login. Please sign out and sign back in.' },
      { status: 401 }
    );
  }

  const accessToken = await getAccessToken(request);

  try {
    const res = await fetch(
      githubApiUrl('issues?labels=agent-submission&state=all&per_page=100'),
      {
        headers: getGithubHeaders(accessToken ?? undefined),
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        return NextResponse.json(
          { error: 'Session expired. Please sign out and sign back in.' },
          { status: 401 }
        );
      }
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 502 });
    }

    const issues: GitHubIssue[] = await res.json();

    const userIssues = issues.filter((issue) => {
      const body = issue.body ?? '';
      const labelNames = issue.labels.map((l) => l.name);
      return body.includes(`**submittedBy:** ${login}`) && !labelNames.includes('user-removed');
    });

    const submissions = userIssues.map((issue) => {
      const labels = issue.labels.map((l) => l.name);
      let status: 'pending' | 'approved' | 'rejected' = 'pending';
      if (labels.includes('approved')) status = 'approved';
      if (labels.includes('rejected') || issue.state === 'closed') {
        status = labels.includes('approved') ? 'approved' : 'rejected';
      }

      // Extract agent name from title "[Agent Submission] DisplayName (platform)"
      const titleMatch = issue.title.match(/\[Agent Submission\]\s*(.+)/);
      const agentName = titleMatch ? titleMatch[1].trim() : issue.title;

      // Extract slug from issue body
      const slugMatch = (issue.body ?? '').match(/\*\*slug:\*\*\s*(\S+)/);
      const slug = slugMatch ? slugMatch[1] : undefined;

      // Parse form fields from issue body for edit support
      const parseField = (field: string) => {
        const match = (issue.body ?? '').match(new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+)`));
        return match ? match[1].trim() : '';
      };

      return {
        number: issue.number,
        title: agentName,
        status,
        slug,
        url: issue.html_url,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        formData: {
          name: parseField('name'),
          displayName: parseField('displayName'),
          description: parseField('description'),
          longDescription: parseField('longDescription'),
          category: parseField('category'),
          model: parseField('model'),
          platform: parseField('platform'),
          author: parseField('author'),
          githubUrl: parseField('githubUrl'),
          capabilities: parseField('capabilities'),
          tools: parseField('tools'),
          tags: parseField('tags'),
        },
      };
    });

    return NextResponse.json({ submissions });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}
