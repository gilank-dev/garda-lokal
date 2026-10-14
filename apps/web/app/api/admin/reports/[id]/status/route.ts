import { NextRequest, NextResponse } from 'next/server';
import { updateReportStatus } from '@/lib/db-adapter';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const reportId = params.id;
  const adminCookie = req.cookies.get('garda_admin_session');

  if (!adminCookie?.value) {
    return NextResponse.json({ error: 'Akses tidak diotorisasi' }, { status: 401 });
  }

  let adminEmail = 'petugas@garda-lokal.id';
  try {
    const session = JSON.parse(adminCookie.value);
    if (session.email) adminEmail = session.email;
  } catch {}

  const forwardedFor = req.headers.get('x-forwarded-for');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

  try {
    const { newStatus, mandatoryNote } = await req.json();

    if (!newStatus) {
      return NextResponse.json({ error: 'Status baru wajib ditentukan.' }, { status: 400 });
    }

    if (!mandatoryNote || typeof mandatoryNote !== 'string' || mandatoryNote.trim().length < 10) {
      return NextResponse.json(
        { error: 'Catatan tindakan petugas wajib diisi minimal 10 karakter.' },
        { status: 400 }
      );
    }

    const result = await updateReportStatus(
      reportId,
      newStatus,
      mandatoryNote,
      adminEmail,
      clientIp
    );

    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.message?.includes('tidak ditemukan') ? 404 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
