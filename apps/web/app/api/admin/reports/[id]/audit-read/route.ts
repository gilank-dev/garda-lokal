import { NextRequest, NextResponse } from 'next/server';
import { recordReadAudit } from '@/lib/db-adapter';

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
    await recordReadAudit(reportId, adminEmail, clientIp);
    return NextResponse.json({ success: true, message: 'Audit baca tercatat.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
