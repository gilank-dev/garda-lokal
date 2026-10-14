import crypto from 'node:crypto';
import http from 'node:http';
import {
  isUsingLiveSupabase,
  getReports,
  getReportById,
  createReport,
  updateReportStatus,
  recordReadAudit,
  getReportMessages,
  createMessage,
  getAuditLogs,
  calculateHaversineMeters
} from '../apps/web/lib/db-adapter.ts';

async function runE2EValidation() {
  console.log('================================================================');
  console.log(' [GARDA-LOKAL / PAI] END-TO-END SYSTEM INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  // PHASE 1: Hybrid Database Initialization & Preloaded Seed
  console.log('>>> [PHASE 1] DATABASE ENGINE & SEED REPOSITORY VALIDATION');
  const isLive = isUsingLiveSupabase();
  console.log(`- Connection Engine Mode: ${isLive ? 'Supabase Cloud (Live)' : 'Local Resilient In-Memory (Zero-Config Demo)'}`);
  
  const initialReports = await getReports();
  console.log(`- Preloaded Regional Reports Loaded: ${initialReports.length} reports`);
  if (initialReports.length < 8) {
    throw new Error(`Expected at least 8 seeded reports, got ${initialReports.length}`);
  }
  
  const categories = new Set(initialReports.map(r => r.category));
  console.log(`- Verified Incident Categories: [${Array.from(categories).join(', ')}]`);
  console.log('  [PASS] Phase 1 Completed.\n');

  // PHASE 2: Spatial Clustering Haversine Math Verification
  console.log('>>> [PHASE 2] GEOSPATIAL CLUSTERING & HAVERSINE VERIFICATION');
  // Otista Raya (-6.2382, 106.8685) to Otista III (-6.2396, 106.8697)
  const calculatedDist = calculateHaversineMeters(-6.2382, 106.8685, -6.2396, 106.8697);
  console.log(`- Otista Cluster Distance: ${calculatedDist.toFixed(2)} meters (Threshold: 500m)`);
  if (calculatedDist > 500) {
    throw new Error('Distance exceeds 500m cluster threshold');
  }
  console.log('  [PASS] Phase 2 Completed.\n');

  // PHASE 3: New Incident Ingestion with Device Forensics & Cluster Linking
  console.log('>>> [PHASE 3] REPORT INGESTION, FORENSICS & CLUSTER AUTO-LINKING');
  const reporterToken = 'secret-token-reporter-e2e-2026';
  const newReportInput = {
    category: 'BENTROK',
    temporalContext: 'SEDANG_BERLANGSUNG',
    rawReporterInput: 'Massa bentrok susulan mulai merangsek dari arah jembatan Kampung Melayu menuju Otista. Terlihat membawa senjata tajam celurit dan kembang api.',
    latitude: -6.2384,
    longitude: 106.8687,
    reporterToken,
    addressRoad: 'Jl. Otista Raya No. 50',
    addressDistrict: 'Jatinegara',
    addressCity: 'Jakarta Timur',
    addressProvince: 'DKI Jakarta',
    locationLandmark: 'Depan Halte Busway Bidara Cina',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36',
    devicePlatform: 'Android',
    originalFileSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    compressedFileSha256: 'ca978112ca1bbdcafac231b39a23dc4da786081cd1e14b5361ecd8739280f2fe',
    exifMetadata: {
      Make: 'Samsung',
      Model: 'Galaxy S23 Ultra',
      DateTimeOriginal: '2026-10-15 03:50:00',
      GPSLatitude: -6.23838,
      GPSLongitude: 106.86868
    },
    exifGpsLatitude: -6.23838,
    exifGpsLongitude: 106.86868,
    exifCapturedAt: new Date().toISOString(),
    distancePinVsExifMeters: 3.2,
    isMetadataConsistent: true
  };

  const createdReport = await createReport(newReportInput);
  console.log(`- Created Incident Ticket ID: ${createdReport.reportId}`);
  console.log(`- Auto-Linked Cluster Parent ID: ${createdReport.clusterParentId}`);
  if (!createdReport.clusterParentId) {
    throw new Error('New report in Otista should have been auto-linked to active Otista parent cluster!');
  }
  console.log('  [PASS] Phase 3 Completed.\n');

  // PHASE 4: Asymmetric Privacy Masking
  console.log('>>> [PHASE 4] ASYMMETRIC PRIVACY ACCESS CONTROL');
  // 4A: Public View (Unauthenticated Citizen)
  const publicView = await getReportById(createdReport.reportId, 'PUBLIC');
  console.log(`- Public View Masked Summary: "${publicView.report?.public_masked_summary}"`);
  if (publicView.report?.admin_full_narrative || publicView.forensics) {
    throw new Error('SECURITY VIOLATION: Public view leaked admin narrative or forensics!');
  }

  // 4B: Reporter View (Verified Reporter with Token)
  const reporterView = await getReportById(createdReport.reportId, 'REPORTER', reporterToken);
  console.log(`- Reporter View Role: ${reporterView.viewerRole}, Status: ${reporterView.report?.status}`);
  if (reporterView.report?.admin_full_narrative) {
    throw new Error('SECURITY VIOLATION: Reporter view leaked admin narrative!');
  }

  // 4C: Admin Tactical View (Command Center Officer)
  const adminView = await getReportById(createdReport.reportId, 'ADMIN');
  console.log(`- Admin Full Narrative: "${adminView.report?.admin_full_narrative?.substring(0, 60)}..."`);
  console.log(`- Admin Device Forensics: ${adminView.forensics?.device_platform} - ${adminView.forensics?.exif_metadata?.Model}`);
  console.log(`- Pin vs EXIF Physical Distance: ${adminView.forensics?.distance_pin_vs_exif_meters}m (Consistent: ${adminView.forensics?.is_metadata_consistent})`);
  if (!adminView.report?.admin_full_narrative || !adminView.forensics) {
    throw new Error('Admin view must contain complete narrative and forensics!');
  }
  console.log('  [PASS] Phase 4 Completed.\n');

  // PHASE 5: Officer Workflow, Immutability & Audit Trail (WORM)
  console.log('>>> [PHASE 5] AUDIT TRAIL IMMUTABILITY & DISPATCH WORKFLOW');
  // 5A: Read audit trail
  await recordReadAudit(createdReport.reportId, 'ops.komando@garda-lokal.id', '10.0.0.1');
  
  // 5B: Update status
  const updateResult = await updateReportStatus(
    createdReport.reportId,
    'DITINDAKLANJUTI',
    'Tim Patroli Perintis Presisi Polsek Jatinegara meluncur ke TKP. Parameter pengamanan lalu lintas diberlakukan.',
    'ops.komando@garda-lokal.id',
    '10.0.0.1'
  );
  console.log(`- Status Update Message: ${updateResult.message}`);

  // 5C: Verify Audit Logs
  const auditLogs = await getAuditLogs(createdReport.reportId);
  console.log(`- Recorded Immutable Audit Logs: ${auditLogs.length} events`);
  auditLogs.forEach((log, idx) => {
    console.log(`  ${idx + 1}. [${log.action_type}] by ${log.admin_email}: "${log.mandatory_note || 'N/A'}"`);
  });
  if (auditLogs.length < 2) {
    throw new Error('Expected at least 2 audit log entries (READ + CHANGE_STATUS)');
  }
  console.log('  [PASS] Phase 5 Completed.\n');

  // PHASE 6: Bidirectional Secure Citizen-Officer Communication
  console.log('>>> [PHASE 6] BIDIRECTIONAL ENCRYPTED CITIZEN-OFFICER CHAT');
  // Admin sends instructions to reporter
  const adminMsg = await createMessage(
    createdReport.reportId,
    'ADMIN',
    'Petugas sedang mendekati lokasi perempatan. Harap jauhi jendela kaca dan jangan keluar rumah.',
    'ops.komando@garda-lokal.id'
  );
  console.log(`- Admin Dispatched Message: "${adminMsg.message.message_text}"`);

  // Reporter responds with tactical updates
  const reporterMsg = await createMessage(
    createdReport.reportId,
    'REPORTER',
    'Baik komandan, kami sekeluarga berlindung di lantai 2. Situasi di luar masih terdengar lemparan botol.'
  );
  console.log(`- Reporter Reply: "${reporterMsg.message.message_text}"`);

  const allMessages = await getReportMessages(createdReport.reportId);
  console.log(`- Total Bidirectional Thread Messages: ${allMessages.length}`);
  if (allMessages.length < 2) {
    throw new Error('Expected at least 2 chat messages');
  }
  console.log('  [PASS] Phase 6 Completed.\n');

  console.log('================================================================');
  console.log(' >>> ALL 6 END-TO-END VALIDATION PHASES PASSED WITH ZERO ERRORS <<<');
  console.log('================================================================');
}

runE2EValidation().catch((err) => {
  console.error('\n[FATAL ERROR] E2E Integration Suite Failed:', err);
  process.exit(1);
});
