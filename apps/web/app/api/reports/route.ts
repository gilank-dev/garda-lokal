import { NextRequest, NextResponse } from 'next/server';
import { createReport, getReports } from '@/lib/db-adapter';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const sortBy = (searchParams.get('sortBy') as 'urgency' | 'created_at') || 'urgency';

    const reports = await getReports({ status, category, sortBy });
    return NextResponse.json({ reports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      category,
      temporalContext,
      rawReporterInput,
      locationLandmark,
      latitude,
      longitude,
      addressRoad,
      addressSubdistrict,
      addressDistrict,
      addressCity,
      addressProvince,
      reporterToken,
      imageWebpBase64,
      originalFileSha256,
      compressedFileSha256,
      exifMetadata,
      exifGpsLatitude,
      exifGpsLongitude,
      exifCapturedAt,
      distancePinVsExifMeters,
      isMetadataConsistent,
    } = body;

    // Validate required fields
    if (!category || !rawReporterInput || latitude == null || longitude == null || !reporterToken) {
      return NextResponse.json(
        { error: 'Field wajib belum lengkap (kategori, kronologi, koordinat, dan token pelapor).' },
        { status: 400 }
      );
    }

    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Garda-Reporter/Web';
    const devicePlatform = req.headers.get('sec-ch-ua-platform') || 'Web Browser';

    const result = await createReport({
      category,
      temporalContext: temporalContext || 'SEDANG_BERLANGSUNG',
      rawReporterInput,
      locationLandmark,
      latitude: Number(latitude),
      longitude: Number(longitude),
      addressRoad,
      addressSubdistrict,
      addressDistrict,
      addressCity,
      addressProvince,
      reporterToken,
      imageWebpBase64,
      originalFileSha256,
      compressedFileSha256,
      exifMetadata,
      exifGpsLatitude,
      exifGpsLongitude,
      exifCapturedAt,
      distancePinVsExifMeters,
      isMetadataConsistent,
      clientIp,
      userAgent,
      devicePlatform,
    });

    return NextResponse.json({
      success: true,
      reportId: result.reportId,
      clusterParentId: result.clusterParentId,
      dbSaved: result.dbSaved,
      vpsQueueStatus: result.vpsQueueStatus,
      vpsMessage: result.vpsMessage,
      message: 'Laporan Diterima. Data Anda telah masuk ke antrean verifikasi petugas.',
    });
  } catch (err: any) {
    console.error('[Report API Exception]', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem dalam memproses laporan.', details: err.message },
      { status: 500 }
    );
  }
}
