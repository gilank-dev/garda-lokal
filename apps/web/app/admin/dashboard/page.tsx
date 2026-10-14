'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Radio,
  Filter,
  RefreshCw,
  AlertTriangle,
  Volume2,
  VolumeX,
  Clock,
  MapPin,
  ChevronRight,
  LogOut,
  Users,
  Layers,
  Flame,
  Search,
  CheckCircle2,
  X,
  Zap,
} from 'lucide-react';
import { Report, ReportStatus, IncidentCategory, TemporalStatus } from '@/lib/types';
import { formatDate, getCategoryBadge, getStatusBadge, getTemporalBadge } from '@/lib/utils';
import {
  playTacticalClick,
  playEmergencySiren,
  isAudioMuted,
  setAudioMuted,
} from '@/lib/audio-feedback';
import { useToast } from '@/components/Toast';
import { ClusterAnalysisModal } from '@/components/ClusterAnalysisModal';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { success, warning } = useToast();

  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('SEMUA');
  const [categoryFilter, setCategoryFilter] = useState<string>('SEMUA');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('SEMUA');
  const [temporalFilter, setTemporalFilter] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasUrgentAlert, setHasUrgentAlert] = useState(false);

  // Cluster Analysis Modal State
  const [selectedClusterReport, setSelectedClusterReport] = useState<Report | null>(null);

  const lastAlertTimeRef = useRef<number>(0);

  // Initialize audio preference
  useEffect(() => {
    setSoundEnabled(!isAudioMuted());
  }, []);

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    setAudioMuted(!nextState);
    if (nextState) {
      playTacticalClick();
      success('Audio alarm darurat taktis diaktifkan', 'AUDIO ON');
    } else {
      success('Audio alarm darurat taktis dinonaktifkan', 'AUDIO MUTE');
    }
  };

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'SEMUA') params.set('status', statusFilter);
      if (categoryFilter !== 'SEMUA') params.set('category', categoryFilter);
      params.set('sortBy', 'urgency');

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const reportList: Report[] = data.reports || [];
        setReports(reportList);

        // Check if any report has urgency >= 80
        const urgent = reportList.some(
          (r) =>
            r.urgency_score >= 80 &&
            (r.status === 'BARU' || r.status === 'DITINDAKLANJUTI' || r.status === 'RAW_UNPROCESSED')
        );

        setHasUrgentAlert(urgent);

        // Sound alert if newly detected and cooldown passed (30s)
        if (urgent && soundEnabled && Date.now() - lastAlertTimeRef.current > 30000) {
          playEmergencySiren();
          lastAlertTimeRef.current = Date.now();
        }
      }
    } catch (e) {
      console.error('Failed to load reports:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for new reports every 10 seconds
  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 10000);
    return () => clearInterval(interval);
  }, [statusFilter, categoryFilter]);

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    // 1. Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        r.raw_reporter_input?.toLowerCase().includes(q) ||
        r.admin_full_narrative?.toLowerCase().includes(q) ||
        r.address_city?.toLowerCase().includes(q) ||
        r.address_district?.toLowerCase().includes(q) ||
        r.location_landmark?.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // 2. Urgency Filter
    if (urgencyFilter === 'KRITIS') {
      if (r.urgency_score < 80) return false;
    } else if (urgencyFilter === 'SEDANG') {
      if (r.urgency_score < 50 || r.urgency_score >= 80) return false;
    } else if (urgencyFilter === 'STANDAR') {
      if (r.urgency_score >= 50) return false;
    }

    // 3. Temporal Context Filter
    if (temporalFilter !== 'SEMUA') {
      if (r.temporal_context !== temporalFilter) return false;
    }

    return true;
  });

  // Key metrics
  const totalCount = reports.length;
  const highUrgencyCount = reports.filter((r) => r.urgency_score >= 80).length;
  const activeCount = reports.filter(
    (r) => r.status === 'BARU' || r.status === 'DITINDAKLANJUTI'
  ).length;
  const completedCount = reports.filter((r) => r.status === 'SELESAI').length;

  return (
    <main className="min-h-screen bg-background text-tactical-bright px-4 sm:px-6 py-5 max-w-5xl mx-auto flex flex-col space-y-5 pb-16">
      {/* Top Command Bar */}
      <header className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded bg-red-950/80 border border-red-700 flex items-center justify-center text-red-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono text-white flex items-center gap-2">
              GARDA-LOKAL COMMAND CENTER
              <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.5 rounded">
                SENTRA KOMANDO
              </span>
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              Dashboard Antrean & Analisis Insiden Nasional
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Audio toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded border text-xs font-mono flex items-center gap-1.5 transition-colors min-h-[40px] px-3 ${
              soundEnabled
                ? 'bg-surface border-border text-emerald-400 hover:text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
            title={soundEnabled ? 'Matikan Suara Alarm' : 'Aktifkan Suara Alarm'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span className="hidden sm:inline font-bold">
              {soundEnabled ? 'ALARM ON' : 'ALARM MUTE'}
            </span>
          </button>

          <button
            onClick={() => {
              playTacticalClick();
              fetchReports();
            }}
            className="p-2 rounded bg-surface border border-border text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors min-h-[40px] px-3"
            title="Refresh antrean"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            href="/"
            onClick={() => playTacticalClick()}
            className="p-2 rounded bg-surface border border-border text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors min-h-[40px] px-3"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </Link>
        </div>
      </header>

      {/* Visual Emergency Alert Banner (Urgency >= 80) */}
      {hasUrgentAlert && (
        <div className="p-3.5 bg-red-950/90 border-2 border-red-600 rounded-xl flex items-center justify-between text-red-200 animate-radar-urgent shadow-xl">
          <div className="flex items-center space-x-3">
            <Flame className="w-6 h-6 text-red-400 shrink-0 animate-bounce" />
            <div>
              <p className="text-xs font-bold font-mono uppercase tracking-wide text-white flex items-center gap-2">
                <span>PERINGATAN DARURAT: URGENSI TINGGI (&ge; 80)</span>
                <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded font-mono">
                  RESPONS SEGERA
                </span>
              </p>
              <p className="text-[11px] text-red-300">
                Terdapat laporan aktif membutuhkan tindakan dan koordinasi segera di lapangan.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playTacticalClick();
              setUrgencyFilter('KRITIS');
            }}
            className="text-xs font-mono bg-red-600 text-white px-3.5 py-2 rounded-lg font-bold hover:bg-red-700 shrink-0 ml-2 min-h-[40px]"
          >
            Filter Kritis
          </button>
        </div>
      )}

      {/* KPI / Metric Counters */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => {
            playTacticalClick();
            setUrgencyFilter('SEMUA');
            setStatusFilter('SEMUA');
          }}
          className="bg-surface hover:bg-surface-hover border border-border p-3.5 rounded-xl shadow-tactical cursor-pointer transition-colors"
        >
          <span className="text-[10px] font-mono text-zinc-500 uppercase block">Total Laporan</span>
          <span className="text-2xl font-bold font-mono text-white">{totalCount}</span>
        </div>
        <div
          onClick={() => {
            playTacticalClick();
            setUrgencyFilter(urgencyFilter === 'KRITIS' ? 'SEMUA' : 'KRITIS');
          }}
          className={`bg-surface hover:bg-surface-hover border p-3.5 rounded-xl shadow-tactical cursor-pointer transition-colors ${
            urgencyFilter === 'KRITIS' ? 'border-red-500 bg-red-950/30' : 'border-red-900/60'
          }`}
        >
          <span className="text-[10px] font-mono text-red-400 uppercase block flex items-center gap-1 font-bold">
            <Flame className="w-3.5 h-3.5" />
            Urgensi &ge; 80 (Kritis)
          </span>
          <span className="text-2xl font-bold font-mono text-red-400">{highUrgencyCount}</span>
        </div>
        <div
          onClick={() => {
            playTacticalClick();
            setStatusFilter(statusFilter === 'DITINDAKLANJUTI' ? 'SEMUA' : 'DITINDAKLANJUTI');
          }}
          className={`bg-surface hover:bg-surface-hover border p-3.5 rounded-xl shadow-tactical cursor-pointer transition-colors ${
            statusFilter === 'DITINDAKLANJUTI' ? 'border-blue-500 bg-blue-950/30' : 'border-blue-900/60'
          }`}
        >
          <span className="text-[10px] font-mono text-blue-400 uppercase block">Aktif / Penanganan</span>
          <span className="text-2xl font-bold font-mono text-blue-400">{activeCount}</span>
        </div>
        <div
          onClick={() => {
            playTacticalClick();
            setStatusFilter(statusFilter === 'SELESAI' ? 'SEMUA' : 'SELESAI');
          }}
          className={`bg-surface hover:bg-surface-hover border p-3.5 rounded-xl shadow-tactical cursor-pointer transition-colors ${
            statusFilter === 'SELESAI' ? 'border-emerald-500 bg-emerald-950/30' : 'border-emerald-900/60'
          }`}
        >
          <span className="text-[10px] font-mono text-emerald-400 uppercase block">Selesai / Terverifikasi</span>
          <span className="text-2xl font-bold font-mono text-emerald-400">{completedCount}</span>
        </div>
      </section>

      {/* Quick Filters and Search Control Panel */}
      <section className="bg-surface border border-border p-3.5 rounded-xl space-y-3 shadow-tactical">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari narasi, kota, patokan, atau ID laporan..."
              className="w-full bg-surface-elevated border border-border pl-9 pr-9 py-2.5 text-xs rounded-lg text-white focus:outline-none focus:border-red-600 placeholder:text-zinc-600 font-sans min-h-[44px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-elevated border border-border px-3 py-2 text-xs rounded-lg text-zinc-300 focus:outline-none focus:border-red-600 font-mono min-h-[44px]"
          >
            <option value="SEMUA">Semua Status</option>
            <option value="BARU">BARU</option>
            <option value="DITINDAKLANJUTI">DITINDAKLANJUTI</option>
            <option value="BUTUH_INFO_PELAPOR">BUTUH INFO PELAPOR</option>
            <option value="SELESAI">SELESAI</option>
            <option value="INDIKASI_PALSU">INDIKASI PALSU</option>
            <option value="RAW_UNPROCESSED">RAW (BELUM DIPROSES)</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-surface-elevated border border-border px-3 py-2 text-xs rounded-lg text-zinc-300 focus:outline-none focus:border-red-600 font-mono min-h-[44px]"
          >
            <option value="SEMUA">Semua Kategori</option>
            <option value="BENTROK">BENTROK / TAWURAN</option>
            <option value="PERUNDUNGAN">PERUNDUNGAN</option>
            <option value="MIRAS_NARKOBA">MIRAS / NARKOBA</option>
            <option value="LAINNYA">LAINNYA</option>
          </select>

          {/* Urgency Score Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="bg-surface-elevated border border-border px-3 py-2 text-xs rounded-lg text-zinc-300 focus:outline-none focus:border-red-600 font-mono min-h-[44px]"
          >
            <option value="SEMUA">Semua Urgensi</option>
            <option value="KRITIS">Kritis (&ge; 80)</option>
            <option value="SEDANG">Sedang (50 - 79)</option>
            <option value="STANDAR">Standar (&lt; 50)</option>
          </select>

          {/* Temporal Filter */}
          <select
            value={temporalFilter}
            onChange={(e) => setTemporalFilter(e.target.value)}
            className="bg-surface-elevated border border-border px-3 py-2 text-xs rounded-lg text-zinc-300 focus:outline-none focus:border-red-600 font-mono min-h-[44px]"
          >
            <option value="SEMUA">Semua Waktu</option>
            <option value="SEDANG_BERLANGSUNG">Sedang Berlangsung</option>
            <option value="RENCANA_MENDATANG">Rencana Mendatang</option>
            <option value="KEJADIAN_LAMPAU">Kejadian Lampau</option>
          </select>
        </div>
      </section>

      {/* Reports Queue List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span className="font-bold">ANTREAN LAPORAN ({filteredReports.length})</span>
          <span className="text-[11px] text-zinc-500">Urutan: Prioritas Urgensi Tertinggi</span>
        </div>

        {filteredReports.length === 0 ? (
          <div className="bg-surface border border-dashed border-border rounded-xl p-8 text-center font-mono text-xs text-zinc-500">
            Tidak ada laporan yang sesuai dengan kriteria filter saat ini.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const catBadge = getCategoryBadge(report.category);
              const statBadge = getStatusBadge(report.status);
              const temporalBadge = getTemporalBadge(report.temporal_context);
              const isUrgent = report.urgency_score >= 80;

              return (
                <div
                  key={report.id}
                  onClick={() => router.push(`/admin/reports/${report.id}`)}
                  className={`p-4 bg-surface hover:bg-surface-hover border rounded-xl cursor-pointer transition-all space-y-3 shadow-tactical ${
                    isUrgent
                      ? 'border-red-700/80 bg-red-950/20 hover:border-red-500'
                      : 'border-border hover:border-zinc-700'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${catBadge.className}`}>
                        {catBadge.label}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${statBadge.className}`}>
                        {statBadge.label}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${temporalBadge.className}`}>
                        {temporalBadge.label}
                      </span>

                      {/* Cluster Badge Trigger */}
                      {report.cluster_count > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTacticalClick();
                            setSelectedClusterReport(report);
                          }}
                          className="text-[10px] font-mono bg-amber-950 text-amber-300 hover:bg-amber-900 border border-amber-600/80 px-2 py-0.5 rounded font-bold transition-colors flex items-center gap-1"
                        >
                          <Layers className="w-3 h-3 text-amber-400" />
                          <span>KLASTER: {report.cluster_count} Laporan</span>
                        </button>
                      )}
                    </div>

                    {/* Scores Gauge */}
                    <div className="flex items-center space-x-2 font-mono text-xs">
                      <div
                        className={`px-2.5 py-1 rounded-md border text-center font-bold ${
                          isUrgent
                            ? 'bg-red-600 text-white border-red-500'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        URGENSI: {report.urgency_score}/100
                      </div>
                      <div className="px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px]">
                        Kredibilitas: {report.credibility_score}%
                      </div>
                    </div>
                  </div>

                  {/* Narrative Preview */}
                  <p className="text-xs text-zinc-200 leading-relaxed line-clamp-2">
                    {report.admin_full_narrative || report.raw_reporter_input}
                  </p>

                  {/* Card Footer */}
                  <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between text-[11px] text-zinc-400 font-mono gap-2">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        {report.address_city || report.address_district || 'Wilayah Terlapor'}
                      </span>
                      <span className="flex items-center gap-1 text-zinc-500">
                        <Clock className="w-3 h-3" />
                        {formatDate(report.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 text-zinc-300 hover:text-white font-medium">
                      <span>Buka Forensik & Verifikasi</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Cluster Analysis Modal */}
      {selectedClusterReport && (
        <ClusterAnalysisModal
          isOpen={Boolean(selectedClusterReport)}
          onClose={() => setSelectedClusterReport(null)}
          primaryReport={selectedClusterReport}
          allReports={reports}
        />
      )}
    </main>
  );
}
