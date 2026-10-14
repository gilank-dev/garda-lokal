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
  calculateHaversineMeters,
} from '../apps/web/lib/db-adapter.ts';

async function runTests() {
  console.log('--- TEST 1: Environment & Live Supabase Detection ---');
  const isLive = isUsingLiveSupabase();
  console.log('isUsingLiveSupabase:', isLive, '(Expected: false in default local demo mode)');

  console.log('\n--- TEST 2: Haversine Calculation Verification ---');
  // Distance between Otista Raya (-6.2382, 106.8685) and Otista III (-6.2396, 106.8697)
  const dist = calculateHaversineMeters(-6.2382, 106.8685, -6.2396, 106.8697);
  console.log(`Calculated distance: ${dist.toFixed(2)}m (Expected: ~204m, < 500m cluster threshold)`);
  if (dist > 500) throw new Error('Distance should be < 500m');

  console.log('\n--- TEST 3: Preloaded Seed Data Inspection ---');
  const allReports = await getReports();
  console.log(`Loaded ${allReports.length} preloaded reports.`);
  allReports.forEach((r) => {
    console.log(`- [${r.category}] ${r.id.substring(0, 8)}... (${r.address_city}) Status: ${r.status}, Urgency: ${r.urgency_score}, Clusters: ${r.cluster_count}`);
  });
  if (allReports.length < 8) throw new Error('Expected at least 8 seeded reports');

  console.log('\n--- TEST 4: Asymmetric Privacy Masking ---');
  const otistaId = '11111111-1111-4111-8111-111111111111';

  // Public view
  const publicView = await getReportById(otistaId, 'PUBLIC');
  console.log('Public View fields:', Object.keys(publicView.report || {}));
  if (publicView.report?.admin_full_narrative) throw new Error('Public view must not leak admin narrative');

  // Reporter view with valid token
  const reporterView = await getReportById(otistaId, 'REPORTER', 'demo-token-otista-jkt-01');
  console.log('Reporter View:', {
    role: reporterView.viewerRole,
    summary: reporterView.report?.public_masked_summary?.substring(0, 40) + '...',
    status: reporterView.report?.status,
  });
  if (reporterView.report?.admin_full_narrative) throw new Error('Reporter view must not leak admin narrative');

  // Admin view
  const adminView = await getReportById(otistaId, 'ADMIN');
  console.log('Admin View:', {
    role: adminView.viewerRole,
    adminNarrative: adminView.report?.admin_full_narrative?.substring(0, 50) + '...',
    device: adminView.forensics?.exif_metadata?.Model,
    consistent: adminView.forensics?.is_metadata_consistent,
  });
  if (!adminView.report?.admin_full_narrative || !adminView.forensics) {
    throw new Error('Admin view must contain full narrative and forensics');
  }

  console.log('\n--- TEST 5: Status Change & Immutable Audit Log ---');
  const updateRes = await updateReportStatus(
    otistaId,
    'DITINDAKLANJUTI',
    'Pengendalian massa berhasil dilakukan, situasi berangsur kondusif.',
    'komando.polda@garda-lokal.id',
    '10.10.1.1'
  );
  console.log('Status update result:', updateRes.message);

  const auditLogs = await getAuditLogs(otistaId);
  console.log(`Audit logs count for ${otistaId}: ${auditLogs.length}`);
  auditLogs.slice(0, 3).forEach((a) => {
    console.log(`- [${a.action_type}] By ${a.admin_email}: "${a.mandatory_note.substring(0, 45)}..."`);
  });

  console.log('\n--- TEST 6: Bidirectional Communication ---');
  const msgRes = await createMessage(
    otistaId,
    'ADMIN',
    'Petugas telah mengamankan perempatan Otista Raya. Warga dapat kembali beraktivitas normal.',
    'komando.polda@garda-lokal.id'
  );
  console.log('Admin message sent:', msgRes.message.message_text);

  const messages = await getReportMessages(otistaId);
  console.log(`Total messages for report: ${messages.length}`);

  console.log('\n--- TEST 7: Report Creation & Cluster Auto-Linking ---');
  // Create a new report close to Otista Raya (-6.2383, 106.8686)
  const newRep = await createReport({
    category: 'BENTROK',
    temporalContext: 'SEDANG_BERLANGSUNG',
    rawReporterInput: 'Laporan warga tambahan: Ada kelompok motor memantau dari seberang halte.',
    latitude: -6.2383,
    longitude: 106.8686,
    reporterToken: 'temp-token-test-12345',
    addressCity: 'Jakarta Timur',
    addressDistrict: 'Jatinegara',
  });
  console.log('Created report ID:', newRep.reportId);
  console.log('Cluster Parent ID:', newRep.clusterParentId, '(Linked to Otista parent:', newRep.clusterParentId === otistaId, ')');
  if (newRep.clusterParentId !== otistaId) {
    throw new Error(`Expected cluster parent ${otistaId}, got ${newRep.clusterParentId}`);
  }

  console.log('\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
