import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/db-adapter';

export async function GET(req: NextRequest) {
  const adminCookie = req.cookies.get('garda_admin_session');
  if (!adminCookie?.value) {
    return NextResponse.json({ error: 'Akses tidak diotorisasi' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get('reportId');

  if (!reportId) {
    return NextResponse.json({ error: 'Parameter reportId wajib disertakan' }, { status: 400 });
  }

  try {
    const logs = await getAuditLogs(reportId);
    return NextResponse.json({ logs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
