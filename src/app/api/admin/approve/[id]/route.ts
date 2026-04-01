import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  void request;
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid submission id' }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.login) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin permission
  const adminLogins = (process.env.ADMIN_LOGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (adminLogins.length === 0) {
    return NextResponse.json({ error: 'ADMIN_LOGINS not configured' }, { status: 503 });
  }
  if (!adminLogins.includes(session.user.login)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { getDb } = await import('@/db');
  const sql = getDb();

  const rows = await sql`
    SELECT id, status FROM submissions WHERE id = ${Number(id)}
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }
  if (rows[0].status !== 'pending') {
    return NextResponse.json({ error: `Submission is already ${rows[0].status}` }, { status: 400 });
  }

  await sql`
    UPDATE submissions SET status = 'approved', updated_at = NOW() WHERE id = ${Number(id)}
  `;

  return NextResponse.json({ success: true, status: 'approved' });
}
