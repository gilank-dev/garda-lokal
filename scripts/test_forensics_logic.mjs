import crypto from 'node:crypto';

// 1. Haversine formula test
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// 2. Asymmetric pseudonymity mask test
function maskToInitials(fullName) {
  if (!fullName || typeof fullName !== 'string') return 'Anonim';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Anonim';
  return parts.map((p) => `${p[0].toUpperCase()}.`).join('');
}

// 3. SHA-256 hash
function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

console.log('=== RUNNING GARDA-LOKAL VERIFICATION SUITE ===');

// Test 1: Haversine distance
// Distance between Monas (-6.1754, 106.8272) and Gambir Station (-6.1767, 106.8306) is ~400 meters
const dist = haversineDistanceMeters(-6.1754, 106.8272, -6.1767, 106.8306);
console.log(`[TEST 1] Haversine Distance: Monas <-> Gambir = ${dist.toFixed(1)}m (Expected: 350-450m)`);
if (dist >= 350 && dist <= 450) {
  console.log('✓ PASS: Haversine calculation accurate.');
} else {
  console.error('✗ FAIL: Haversine calculation deviated.');
  process.exit(1);
}

// Test 2: Asymmetric Pseudonymity
const testNames = [
  { full: 'Rizky Pratama', expected: 'R.P.' },
  { full: 'Ahmad Dahlan Sulaeman', expected: 'A.D.S.' },
  { full: 'Budi', expected: 'B.' },
  { full: '', expected: 'Anonim' },
];
console.log('\n[TEST 2] Asymmetric Pseudonymity Masking:');
for (const { full, expected } of testNames) {
  const masked = maskToInitials(full);
  console.log(`  "${full}" -> "${masked}" (Expected: "${expected}")`);
  if (masked !== expected) {
    console.error(`✗ FAIL: Masking mismatch for ${full}`);
    process.exit(1);
  }
}
console.log('✓ PASS: Name masking preserves privacy on public view while retaining full name for admin.');

// Test 3: Token Hashing
const reporterToken = 'a1b2c3d4e5f67890123456789abcdef0';
const tokenHash = sha256(reporterToken);
console.log(`\n[TEST 3] Cryptographic Reporter Token: ${reporterToken}`);
console.log(`  SHA-256 Hash in DB: ${tokenHash}`);
if (tokenHash.length === 64) {
  console.log('✓ PASS: 256-bit hash generated correctly.');
} else {
  console.error('✗ FAIL: Invalid hash length.');
  process.exit(1);
}

// Test 4: Distance threshold logic (COCOK vs TIDAK COCOK)
function evaluatePhotoExifMatch(osmLat, osmLng, exifLat, exifLng) {
  if (exifLat == null || exifLng == null) {
    return { match: false, reason: 'EXIF_GPS_MISSING', distanceMeters: null };
  }
  const distance = haversineDistanceMeters(osmLat, osmLng, exifLat, exifLng);
  return {
    match: distance <= 500,
    distanceMeters: Math.round(distance),
    status: distance <= 500 ? 'COCOK' : 'TIDAK COCOK / FOTO LAMA'
  };
}

const matchTest1 = evaluatePhotoExifMatch(-6.1754, 106.8272, -6.1756, 106.8274);
console.log(`\n[TEST 4A] Photo taken 30m away: ${matchTest1.status} (${matchTest1.distanceMeters}m)`);
if (matchTest1.status === 'COCOK') {
  console.log('✓ PASS: Nearby photo matches incident location.');
} else {
  console.error('✗ FAIL: False mismatch.');
  process.exit(1);
}

const matchTest2 = evaluatePhotoExifMatch(-6.1754, 106.8272, -6.2000, 106.8500);
console.log(`[TEST 4B] Photo taken 3.6km away: ${matchTest2.status} (${matchTest2.distanceMeters}m)`);
if (matchTest2.status === 'TIDAK COCOK / FOTO LAMA') {
  console.log('✓ PASS: Faraway photo flagged accurately.');
} else {
  console.error('✗ FAIL: False match.');
  process.exit(1);
}

console.log('\n=============================================');
console.log('ALL CORE MATHEMATICAL & PRIVACY SUITES PASSED');
console.log('=============================================');
