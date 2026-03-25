import { NextRequest, NextResponse } from 'next/server';
import { getAgents } from '@/lib/data';
import { auth } from '@/lib/auth';
import { agentSubmissionSchema } from '@/lib/validation';
import { checkMaliciousContent } from '@/lib/security';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const result = getAgents({
    q: sp.get('q') || undefined,
    category: sp.get('category') || undefined,
    model: sp.get('model') || undefined,
    source: sp.get('source') || undefined,
    platform: sp.get('platform') || undefined,
    sort: sp.get('sort') || undefined,
    page: sp.get('page') ? Number(sp.get('page')) : undefined,
    limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
  });
  return NextResponse.json(result);
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required. Please sign in with GitHub.' },
      { status: 401 }
    );
  }

  const body = await request.json();

  // Validate input
  const parsed = agentSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Security check
  const securityCheck = checkMaliciousContent(body);
  if (!securityCheck.safe) {
    return NextResponse.json(
      { error: 'Security check failed', issues: securityCheck.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const slug = slugify(data.name);

  // Save to Supabase if configured
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('submissions').insert({
      slug,
      name: data.name,
      display_name: data.displayName,
      description: data.description,
      long_description: data.longDescription || null,
      category: data.category,
      model: data.model,
      source: 'community',
      author: data.author,
      github_url: data.githubUrl || null,
      capabilities: data.capabilities?.split(',').map((s) => s.trim()).filter(Boolean) || [],
      tools: data.tools?.split(',').map((s) => s.trim()).filter(Boolean) || [],
      tags: data.tags?.split(',').map((s) => s.trim()).filter(Boolean) || [],
      status: 'pending',
      submitted_by: session.user.name || session.user.email || 'unknown',
      submitted_by_avatar: session.user.image || null,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save submission', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, slug, message: 'Submission saved. It will be reviewed before publishing.' },
      { status: 201 }
    );
  }

  // Fallback: no Supabase configured
  return NextResponse.json(
    {
      error: 'Database not configured. Please set up Supabase environment variables to enable submissions.',
    },
    { status: 503 }
  );
}
