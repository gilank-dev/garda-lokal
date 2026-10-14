import { NextRequest, NextResponse } from 'next/server';
import { getReports } from '@/lib/db-adapter';

export async function GET(req: NextRequest) {
  const adminCookie = req.cookies.get('garda_admin_session');
  if (!adminCookie?.value) {
    return NextResponse.json({ error: 'Akses tidak diotorisasi' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status') || undefined;
  const categoryFilter = searchParams.get('category') || undefined;
  const sortBy = (searchParams.get('sortBy') as 'urgency' | 'created_at') || 'urgency';

  try {
    const reports = await getReports({
      status: statusFilter,
      category: categoryFilter,
      sortBy,
    });

    return NextResponse.json({ reports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
