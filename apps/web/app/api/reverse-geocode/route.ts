import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Parameter lat dan lng wajib diisi' }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'GardaLokal-EmergencyPlatform/1.0 (kontak: admin@garda-lokal.id)',
        'Accept-Language': 'id-ID, id;q=0.9, en;q=0.8',
      },
      next: { revalidate: 3600 }, // Cache coordinates reverse geocoding for 1 hour
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Nominatim responded with HTTP ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const addr = data.address || {};

    const road = addr.road || addr.street || addr.pedestrian || addr.footway || null;
    const subdistrict = addr.village || addr.suburb || addr.quarter || addr.neighbourhood || null;
    const district = addr.city_district || addr.district || addr.subdistrict || null;
    const city = addr.city || addr.town || addr.municipality || addr.county || null;
    const province = addr.state || addr.province || null;

    return NextResponse.json({
      displayName: data.display_name || 'Lokasi tidak bernama',
      road,
      subdistrict,
      district,
      city,
      province,
      raw: data,
    });
  } catch (err: any) {
    console.error('Reverse Geocode Error:', err);
    return NextResponse.json(
      { error: 'Gagal menghubungi layanan geocoding', details: err.message },
      { status: 500 }
    );
  }
}
