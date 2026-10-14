import { NextRequest, NextResponse } from 'next/server';
import { getReportById } from '@/lib/db-adapter';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const reportId = params.id;
  const tokenHeader = req.headers.get('x-reporter-token');
  const adminCookie = req.cookies.get('garda_admin_session');

  try {
    const isAdmin = Boolean(adminCookie?.value);
    const userRole: 'ADMIN' | 'REPORTER' | 'PUBLIC' = isAdmin
      ? 'ADMIN'
      : tokenHeader
      ? 'REPORTER'
      : 'PUBLIC';

    const result = await getReportById(reportId, userRole, tokenHeader);

    if (!result.report) {
      return NextResponse.json(
        { error: 'Laporan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      report: result.report,
      forensics: result.forensics || null,
      viewerRole: result.viewerRole,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Gagal mengambil data laporan', details: err.message },
      { status: 500 }
    );
  }
}
