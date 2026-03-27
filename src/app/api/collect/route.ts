import { NextRequest, NextResponse } from 'next/server';
import { collectAgents } from '@/lib/collector';
import { getAllAgentSlugs } from '@/lib/data';

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existingSlugs = new Set(getAllAgentSlugs());
  const collected = await collectAgents(existingSlugs);
  return NextResponse.json({
    success: true,
    collected: collected.length,
    entries: collected,
  });
}
