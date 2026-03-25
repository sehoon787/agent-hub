import { NextResponse } from 'next/server';
import { collectAgents } from '@/lib/collector';
import { getAllAgentSlugs } from '@/lib/data';

export async function POST() {
  const existingSlugs = new Set(getAllAgentSlugs());
  const collected = await collectAgents(existingSlugs);
  return NextResponse.json({
    success: true,
    collected: collected.length,
    entries: collected,
  });
}
