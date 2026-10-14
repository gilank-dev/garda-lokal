'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldAlert,
  MapPin,
  ExternalLink,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Users,
  Send,
  History,
  FileText,
  Crosshair,
  Lock,
  Flame,
  Check,
  Printer,
  Layers,
  Copy,
} from 'lucide-react';
import {
  Report,
  ReportForensics,
  ReportMessage,
  AdminAuditLog,
  ReportStatus,
} from '@/lib/types';
import {
  formatDate,
  formatCoordinates,
  formatDistance,
  getCategoryBadge,
  getStatusBadge,
  getTemporalBadge,
} from '@/lib/utils';
import {
  playTacticalClick,
  playSuccessChime,
  playWarningTone,
} from '@/lib/audio-feedback';
import { useToast } from '@/components/Toast';
import { TacticalDossierModal } from '@/components/TacticalDossierModal';
import { ClusterAnalysisModal } from '@/components/ClusterAnalysisModal';

// Dynamically import Leaflet TacticalMap with SSR disabled
const TacticalMap = dynamic(() => import('@/components/TacticalMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-md border border-border bg-surface flex items-center justify-center font-mono text-xs text-zinc-500">
      Memuat Peta Forensik Geospasial...
    </div>
  ),
});

export default function AdminReportDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const reportId = params.id;
  const { success, warning, error } = useToast();

  const [report, setReport] = useState<Report | null>(null);
  const [forensics, setForensics] = useState<ReportForensics | null>(null);
  const [messages, setMessages] = useState<ReportMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Status Change Form
  const [newStatus, setNewStatus] = useState<ReportStatus>('DITINDAKLANJUTI');
  const [mandatoryNote, setMandatoryNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Message to Reporter Form
  const [replyText, setReplyText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Modals State
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isClusterModalOpen, setIsClusterModalOpen] = useState(false);

  // 1. Fetch Report Data & Trigger Auto-Read Audit
  useEffect(() => {
    const loadReportData = async () => {
      setIsLoading(true);
      try {
        // Fetch report & forensics
        const res = await fetch(`/api/reports/${reportId}`);
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setReport(data.report);
          setForensics(data.forensics);
          if (data.report?.status) {
            setNewStatus(data.report.status);
          }
        }

        // Trigger Auto-Read Audit Log
        fetch(`/api/admin/reports/${reportId}/audit-read`, { method: 'POST' }).catch(() => {});

        // Fetch Messages
        const msgRes = await fetch(`/api/reports/${reportId}/messages`);
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(msgData.messages || []);
        }

        // Fetch Audit Logs
        fetchAuditLogs();

        // Fetch All Reports for Cluster Context
        const allRes = await fetch('/api/admin/reports');
        if (allRes.ok) {
          const allData = await allRes.json();
          setAllReports(allData.reports || []);
        }
      } catch (e) {
        console.error('Failed to load detail report:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadReportData();
  }, [reportId]);

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`/api/admin/audit-logs?reportId=${reportId}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.warn('Failed to fetch audit logs:', e);
    }
  };

  // Handle Status Update (Mandatory Note >= 10 chars)
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mandatoryNote || mandatoryNote.trim().length < 10) {
      playWarningTone();
      warning('Catatan tindakan petugas wajib diisi minimal 10 karakter.', 'CATATAN MANDATORI');
      return;
    }

    setIsUpdatingStatus(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/admin/reports/${reportId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStatus,
          mandatoryNote: mandatoryNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengubah status');
      }

      playSuccessChime();
      setStatusMessage('Status berhasil diperbarui dan direkam dalam audit imutabel.');
      success(`Status berhasil diubah ke ${newStatus}`, 'STATUS DIPERBARUI');
      setMandatoryNote('');
      if (report) {
        setReport({ ...report, status: newStatus });
      }
      fetchAuditLogs();
    } catch (err: any) {
      playWarningTone();
      error('Error: ' + err.message, 'GAGAL UBAH STATUS');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Send Message to Reporter
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSendingMessage(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageText: replyText.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setReplyText('');
        playSuccessChime();
        success('Pesan klarifikasi berhasil dikirim ke pelapor.', 'TERKIRIM');
        fetchAuditLogs();
      } else {
        const err = await res.json();
        playWarningTone();
        warning(err.error || 'Gagal mengirim pesan', 'GAGAL KIRIM');
      }
    } catch (err: any) {
      playWarningTone();
      warning('Koneksi transmisi data gagal.', 'KONEKSI');
    } finally {
      setIsSendingMessage(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-tactical-bright p-6 max-w-5xl mx-auto font-mono text-xs text-zinc-500">
        Memuat data forensik dan riwayat audit...
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-background text-tactical-bright p-6 max-w-5xl mx-auto space-y-4">
        <Link
          href="/admin/dashboard"
          className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
        </Link>
        <div className="p-8 text-center text-zinc-400 font-mono text-xs border border-border bg-surface rounded-xl">
          Laporan tidak ditemukan atau telah dihapus.
        </div>
      </main>
    );
  }

  const catBadge = getCategoryBadge(report.category);
  const statBadge = getStatusBadge(report.status);
  const temporalBadge = getTemporalBadge(report.temporal_context);
  const isUrgent = report.urgency_score >= 80;

  return (
    <main className="min-h-screen bg-background text-tactical-bright px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-6 pb-20">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2">
        <Link
          href="/admin/dashboard"
          onClick={() => playTacticalClick()}
          className="flex items-center space-x-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors min-h-[44px] pr-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Antrean Komando</span>
        </Link>

        {/* Action Buttons: Export Dossier & Print */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              playTacticalClick();
              setIsDossierOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-mono text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 border border-emerald-500 shadow-md transition-all min-h-[40px]"
          >
            <Printer className="w-4 h-4" />
            <span>Ekspor Berita Acara / Dossier</span>
          </button>

          <div className="flex items-center space-x-1 font-mono text-xs bg-surface border border-border px-2.5 py-1.5 rounded-lg text-zinc-400">
            <span>ID:</span>
            <span className="text-zinc-200 font-bold">#{report.id.substring(0, 8)}</span>
          </div>
        </div>
      </div>

      {/* Header Summary & Badges */}
      <header className="bg-surface border border-border rounded-xl p-5 shadow-tactical space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-mono px-2.5 py-1 rounded ${catBadge.className}`}>
              {catBadge.label}
            </span>
            <span className={`text-xs font-mono px-2.5 py-1 rounded ${statBadge.className}`}>
              {statBadge.label}
            </span>
            <span className={`text-xs font-mono px-2.5 py-1 rounded ${temporalBadge.className}`}>
              {temporalBadge.label}
            </span>

            {/* Clustered badge trigger */}
            {report.cluster_count > 1 && (
              <button
                type="button"
                onClick={() => {
                  playTacticalClick();
                  setIsClusterModalOpen(true);
                }}
                className="text-xs font-mono bg-amber-950 text-amber-300 hover:bg-amber-900 border border-amber-600/80 px-2.5 py-1 rounded font-bold transition-colors flex items-center gap-1 min-h-[32px]"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>[KLASTER: {report.cluster_count} Laporan di Area Ini]</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <div
              className={`px-3 py-1.5 rounded-lg border font-bold ${
                isUrgent ? 'bg-red-600 text-white border-red-500' : 'bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
            >
              SKOR URGENSI: {report.urgency_score}/100
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
              KREDIBILITAS: {report.credibility_score}%
            </div>
          </div>
        </div>

        {/* Hoax Alert if detected */}
        {report.is_potential_hoax && (
          <div className="p-3 bg-red-950/70 border border-red-700 rounded-lg text-xs text-red-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold font-mono">TERINDIKASI LAPORAN PALSU / ADU DOMBA: </span>
              <span>{report.hoax_reason || 'Pola laporan tidak logis atau metadata bertentangan.'}</span>
            </div>
          </div>
        )}

        {/* Location & Time Subtitle */}
        <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 font-mono pt-2 border-t border-border/40 gap-2">
          <div className="flex items-center space-x-3">
            <span className="flex items-center gap-1 text-zinc-300">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              {report.address_road ? `${report.address_road}, ` : ''}
              {report.address_subdistrict ? `${report.address_subdistrict}, ` : ''}
              {report.address_city || 'Wilayah Terlapor'}
            </span>
          </div>
          <div className="flex items-center space-x-1 text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Dilaporkan: {formatDate(report.created_at)}</span>
          </div>
        </div>
      </header>

      {/* Grid: Unmasked Information & Geospatial Forensics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Unmasked Full Narrative & Extracted Entities */}
        <div className="space-y-6">
          {/* Panel Informasi Utuh (Unmasked) */}
          <section className="bg-surface border border-border rounded-xl p-5 shadow-tactical space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-400" />
                Narasi Lengkap & Intelijen Lapangan (Utuh)
              </h2>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                NAMA LENGKAP UTUH
              </span>
            </div>

            {/* Admin Full Narrative */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-zinc-400 uppercase">
                Hasil Analisis & Kronologi Terstruktur:
              </span>
              <div className="p-3.5 bg-surface-elevated/70 border border-border rounded-lg text-xs leading-relaxed text-zinc-100 whitespace-pre-wrap">
                {report.admin_full_narrative || report.raw_reporter_input}
              </div>
            </div>

            {/* Tactical Recommendation */}
            {report.tactical_recommendation && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-amber-400 uppercase font-bold">
                  Rekomendasi Tindakan Taktis Lapangan:
                </span>
                <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg text-xs leading-relaxed text-amber-200">
                  {report.tactical_recommendation}
                </div>
              </div>
            )}

            {/* Extracted Entities */}
            {report.extracted_entities && (
              <div className="pt-2 border-t border-border/40 space-y-2.5">
                <span className="text-[11px] font-mono text-zinc-400 uppercase block font-bold">
                  Entitas Teridentifikasi:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-surface-elevated border border-border rounded-lg">
                    <span className="text-[10px] font-mono text-zinc-500 block mb-1">
                      Pihak Terlibat / Nama Lengkap:
                    </span>
                    <span className="font-semibold text-white">
                      {report.extracted_entities.involved_persons_full_names?.length > 0
                        ? report.extracted_entities.involved_persons_full_names.join(', ')
                        : 'Tidak ada nama spesifik'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-surface-elevated border border-border rounded-lg">
                    <span className="text-[10px] font-mono text-zinc-500 block mb-1">
                      Senjata / Barang Bukti:
                    </span>
                    <span className="font-semibold text-amber-300">
                      {report.extracted_entities.weapons_or_substances?.length > 0
                        ? report.extracted_entities.weapons_or_substances.join(', ')
                        : 'Tidak ada senjata terlapor'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Raw Input from Reporter */}
            <div className="pt-2 border-t border-border/40 space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">
                Teks Asli Pelapor:
              </span>
              <p className="text-xs text-zinc-400 italic bg-surface-elevated/40 p-2.5 rounded border border-border">
                &ldquo;{report.raw_reporter_input}&rdquo;
              </p>
              {report.location_landmark && (
                <p className="text-[11px] text-zinc-400 font-mono">
                  <span className="text-zinc-500">Patokan Lokasi:</span> {report.location_landmark}
                </p>
              )}
            </div>
          </section>

          {/* Panel Komunikasi Dua Arah ke Pelapor */}
          <section className="bg-surface border border-border rounded-xl p-5 shadow-tactical space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-400" />
                Komunikasi Tiket ke Pelapor
              </h2>
              <span className="text-[10px] font-mono text-zinc-400">
                {messages.length} Pesan
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
              {messages.length === 0 ? (
                <p className="text-xs font-mono text-zinc-500 text-center py-4">
                  Belum ada pesan klarifikasi dikirim ke pelapor.
                </p>
              ) : (
                messages.map((m) => {
                  const isAdmin = m.sender_role === 'ADMIN';
                  return (
                    <div
                      key={m.id}
                      className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                        isAdmin
                          ? 'bg-blue-950/60 border border-blue-800/80 text-blue-100 ml-4'
                          : 'bg-zinc-800 border border-zinc-700 text-zinc-200 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                        <span>{isAdmin ? `PETUGAS (${m.admin_email || 'RESMI'})` : 'PELAPOR'}</span>
                        <span>{formatDate(m.created_at)}</span>
                      </div>
                      <p>{m.message_text}</p>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="pt-2 border-t border-border/60 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Tanyakan detail tambahan ke pelapor..."
                className="flex-1 bg-surface-elevated border border-border px-3 py-2 text-xs rounded-lg text-white focus:outline-none focus:border-red-600 placeholder:text-zinc-600 font-sans min-h-[44px]"
              />
              <button
                type="submit"
                disabled={isSendingMessage || !replyText.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 text-white font-mono text-xs px-4 py-2 rounded-lg border border-blue-500 transition-colors shrink-0 min-h-[44px] flex items-center justify-center font-bold"
              >
                {isSendingMessage ? '...' : 'Kirim'}
              </button>
            </form>
          </section>
        </div>

        {/* Right Column: Geospatial & Forensic EXIF Panel + Change Status Panel */}
        <div className="space-y-6">
          {/* Panel Geospasial & Peta */}
          <section className="bg-surface border border-border rounded-xl p-5 shadow-tactical space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-red-500" />
                Geospasial Titik Kejadian (OSM)
              </h2>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 border border-border bg-surface-elevated px-2.5 py-1.5 rounded-lg min-h-[36px]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Navigasi Peta
              </a>
            </div>

            <div className="rounded-lg overflow-hidden border border-border">
              <TacticalMap
                latitude={report.latitude}
                longitude={report.longitude}
                interactive={false}
                exifLatitude={forensics?.exif_gps_latitude}
                exifLongitude={forensics?.exif_gps_longitude}
                className="h-64 w-full"
              />
            </div>

            {/* Photo Proof & EXIF Metadata Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-zinc-300 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-amber-400" />
                  Bukti Foto & Forensik Kamera
                </span>
                {forensics?.is_metadata_consistent ? (
                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-700 px-2 py-0.5 rounded">
                    METADATA COCOK
                  </span>
                ) : (
                  <span className="text-[10px] font-mono bg-red-950 text-red-400 border border-red-700 px-2 py-0.5 rounded font-bold">
                    TIDAK COCOK / FOTO LAMA
                  </span>
                )}
              </div>

              {/* Forensics Side-by-Side Comparison Table */}
              <div className="bg-surface-elevated border border-border rounded-lg p-3 text-[11px] font-mono space-y-2">
                <div className="grid grid-cols-2 gap-2 border-b border-border/60 pb-2">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Titik Pin Peta Pelapor:</span>
                    <span className="text-white font-bold">
                      {formatCoordinates(report.latitude, report.longitude)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">EXIF GPS Asli Kamera:</span>
                    <span className={forensics?.exif_gps_latitude ? 'text-blue-400 font-bold' : 'text-zinc-500'}>
                      {forensics?.exif_gps_latitude
                        ? formatCoordinates(forensics.exif_gps_latitude, forensics.exif_gps_longitude)
                        : 'Tidak Tertanam'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-b border-border/60 pb-2">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Perangkat Kamera:</span>
                    <span className="text-zinc-300">
                      {forensics?.exif_metadata?.Model ||
                        forensics?.exif_metadata?.Make ||
                        forensics?.device_platform ||
                        'Tidak terdeteksi'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Selisih Jarak:</span>
                    <span
                      className={
                        forensics?.distance_pin_vs_exif_meters != null &&
                        forensics.distance_pin_vs_exif_meters <= 500
                          ? 'text-emerald-400 font-bold'
                          : 'text-red-400 font-bold'
                      }
                    >
                      {formatDistance(forensics?.distance_pin_vs_exif_meters)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-[10px] text-zinc-500 pt-1">
                  <div className="truncate">
                    <span>SHA-256 Asli: </span>
                    <span className="text-zinc-400">{forensics?.original_file_sha256 || '-'}</span>
                  </div>
                  <div className="truncate">
                    <span>SHA-256 WebP: </span>
                    <span className="text-zinc-400">{forensics?.compressed_file_sha256 || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Panel Ubah Status (Wajib Catatan Tindakan) */}
          <section className="bg-surface border border-border rounded-xl p-5 shadow-tactical space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-white flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-emerald-400" />
                Disposisi & Ubah Status Penanganan
              </h2>
              <span className="text-[10px] font-mono text-zinc-500">Log Imutabel</span>
            </div>

            {statusMessage && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-700 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono font-medium text-zinc-300">Pilih Status Baru:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ReportStatus)}
                  className="w-full bg-surface-elevated border border-border px-3 py-2.5 text-xs rounded-lg text-white focus:outline-none focus:border-red-600 font-mono min-h-[44px]"
                >
                  <option value="DITINDAKLANJUTI">DITINDAKLANJUTI (Tim Meluncur)</option>
                  <option value="BUTUH_INFO_PELAPOR">BUTUH INFO TAMBAHAN DARI PELAPOR</option>
                  <option value="SELESAI">SELESAI (Insiden Teratasi)</option>
                  <option value="INDIKASI_PALSU">INDIKASI PALSU (Tolak Laporan)</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-medium text-zinc-300">
                    Catatan Tindakan Petugas (Wajib):
                  </label>
                  <span
                    className={`text-[10px] font-mono ${
                      mandatoryNote.trim().length >= 10 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {mandatoryNote.trim().length}/10 Karakter Min
                  </span>
                </div>
                <textarea
                  required
                  rows={3}
                  value={mandatoryNote}
                  onChange={(e) => setMandatoryNote(e.target.value)}
                  placeholder="Tuliskan tindakan konkret (contoh: Petugas patroli Polsek menuju TKP dan berkoordinasi dengan warga sekitar...)"
                  className="w-full bg-surface-elevated border border-border p-3 text-xs rounded-lg text-white focus:outline-none focus:border-red-600 placeholder:text-zinc-600 font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingStatus || mandatoryNote.trim().length < 10}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-mono text-xs font-bold py-3.5 rounded-lg border border-emerald-500 disabled:border-zinc-700 transition-colors uppercase tracking-wider min-h-[48px]"
              >
                {isUpdatingStatus ? 'Mencatat ke Log Permanen...' : 'Perbarui Status & Rekam Log Audit'}
              </button>
            </form>
          </section>
        </div>
      </div>

      {/* Immutable Audit Log Table (Permanent Append-Only View) */}
      <section className="bg-surface border border-border rounded-xl p-5 shadow-tactical space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-zinc-400" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-white">
              Riwayat Audit Permanen (Immutable Audit Trail)
            </h2>
          </div>
          <div className="flex items-center space-x-1 text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded">
            <Lock className="w-3 h-3" />
            <span>ANTI-HAPUS & ANTI-EDIT (POSTGRES TRIGGER)</span>
          </div>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs font-mono text-zinc-500 text-center py-4">
            Belum ada aktivitas audit tercatat.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-border text-zinc-500 text-[10px] uppercase">
                  <th className="py-2 px-3">Waktu Presisi</th>
                  <th className="py-2 px-3">Petugas</th>
                  <th className="py-2 px-3">Aksi</th>
                  <th className="py-2 px-3">Perubahan Status</th>
                  <th className="py-2 px-3">Catatan Tindakan Mandatori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-zinc-300">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-elevated/40">
                    <td className="py-2.5 px-3 whitespace-nowrap text-zinc-400 text-[11px]">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-white font-medium">
                      {log.admin_email}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300">
                        {log.action_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">
                      {log.previous_status && log.new_status ? (
                        <span>
                          <span className="text-zinc-500">{log.previous_status}</span> &rarr;{' '}
                          <span className="text-emerald-400 font-bold">{log.new_status}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-200 font-sans text-xs leading-relaxed max-w-xs">
                      {log.mandatory_note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Tactical Dossier Print Modal */}
      {isDossierOpen && (
        <TacticalDossierModal
          isOpen={isDossierOpen}
          onClose={() => setIsDossierOpen(false)}
          report={report}
          forensics={forensics}
        />
      )}

      {/* Cluster Analysis Modal */}
      {isClusterModalOpen && (
        <ClusterAnalysisModal
          isOpen={isClusterModalOpen}
          onClose={() => setIsClusterModalOpen(false)}
          primaryReport={report}
          allReports={allReports}
        />
      )}
    </main>
  );
}
