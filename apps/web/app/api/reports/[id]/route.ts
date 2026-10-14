import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getReportById, updateReportIntelligence } from '@/lib/db-adapter';

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleIntelligenceUpdate(req, params.id);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleIntelligenceUpdate(req, params.id);
}

async function handleIntelligenceUpdate(req: NextRequest, reportId: string) {
  const timestampHeader = req.headers.get('x-garda-timestamp');
  const signatureHeader = req.headers.get('x-garda-signature');
  const adminCookie = req.cookies.get('garda_admin_session');
  const sharedSecret = process.env.SHARED_VPS_SECRET || 'garda_secret_2026_dev';

  let isAuthorized = false;

  // 1. Check Admin Session
  if (adminCookie?.value) {
    isAuthorized = true;
  }

  // 2. Check HMAC Signature from VPS Worker
  let rawBody = '';
  if (timestampHeader && signatureHeader) {
    rawBody = await req.text();
    const clientTimestamp = parseInt(timestampHeader, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Replay attack prevention: max 120s deviation
    if (Math.abs(currentTimestamp - clientTimestamp) <= 120) {
      const expectedHmac = crypto
        .createHmac('sha256', sharedSecret)
        .update(`${timestampHeader}.${rawBody}`)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedHmac, 'hex');
      const receivedBuf = Buffer.from(signatureHeader, 'hex');

      if (expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Akses ditolak: Tanda tangan HMAC tidak valid atau sesi admin tidak ditemukan.' },
      { status: 401 }
    );
  }

  try {
    const payload = rawBody ? JSON.parse(rawBody) : await req.json();
    const updated = await updateReportIntelligence(reportId, payload);

    return NextResponse.json({
      success: true,
      message: 'Intelijen laporan berhasil disinkronisasi.',
      report: updated.report,
    });
  } catch (err: any) {
    console.error('[Update Intelligence Error]', err);
    return NextResponse.json(
      { error: 'Gagal memperbarui intelijen laporan', details: err.message },
      { status: 500 }
    );
  }
}
