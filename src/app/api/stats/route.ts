import { NextResponse } from 'next/server';
import { getStats } from '@/lib/data';

export async function GET() {
  return NextResponse.json(getStats());
}
