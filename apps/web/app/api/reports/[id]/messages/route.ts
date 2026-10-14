import { NextRequest, NextResponse } from 'next/server';
import { getReportMessages, createMessage } from '@/lib/db-adapter';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const reportId = params.id;

  try {
    const messages = await getReportMessages(reportId);
    return NextResponse.json({ messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const reportId = params.id;
  const adminCookie = req.cookies.get('garda_admin_session');
  const tokenHeader = req.headers.get('x-reporter-token');

  try {
    const body = await req.json();
    const { messageText } = body;

    if (!messageText || typeof messageText !== 'string' || messageText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Pesan tidak boleh kosong' },
        { status: 400 }
      );
    }

    let senderRole: 'ADMIN' | 'REPORTER' = 'REPORTER';
    let adminEmail: string | null = null;

    if (adminCookie?.value) {
      try {
        const sessionData = JSON.parse(adminCookie.value);
        senderRole = 'ADMIN';
        adminEmail = sessionData.email || 'petugas@garda-lokal.id';
      } catch {
        senderRole = 'ADMIN';
        adminEmail = 'petugas@garda-lokal.id';
      }
    } else if (tokenHeader) {
      senderRole = 'REPORTER';
    } else {
      return NextResponse.json({ error: 'Akses tidak diotorisasi' }, { status: 401 });
    }

    const result = await createMessage(
      reportId,
      senderRole,
      messageText,
      adminEmail,
      tokenHeader
    );

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (err: any) {
    const status = err.message?.includes('tidak valid') || err.message?.includes('tidak diotorisasi') ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
