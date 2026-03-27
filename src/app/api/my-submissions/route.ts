import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

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

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const login = session.user.login;
  const email = session.user.email;
  const name = session.user.name;

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ error: 'GitHub integration not configured' }, { status: 503 });
  }

  try {
    const res = await fetch(
      'https://api.github.com/repos/sehoon787/agent-hub/issues?labels=agent-submission&state=all&per_page=100',
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 502 });
    }

    const issues: GitHubIssue[] = await res.json();

    // Filter by submitter identity (check body for submittedBy field)
    const userIssues = issues.filter((issue) => {
      const body = issue.body ?? '';
      // Match by GitHub login, email, or name in the submittedBy field
      if (login && body.includes(`**submittedBy:** ${login}`)) return true;
      if (email && body.includes(`**submittedBy:** ${email}`)) return true;
      if (name && body.includes(`**submittedBy:** ${name}`)) return true;
      return false;
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

      return {
        number: issue.number,
        title: agentName,
        status,
        slug,
        url: issue.html_url,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
      };
    });

    return NextResponse.json({ submissions });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}
